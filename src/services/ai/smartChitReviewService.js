import { SupabaseAuthService } from "../auth/SupabaseAuthService.js";
import {
  applyOwnerCorrections,
  confirmBusinessUnderstanding,
  createChitFromBusinessUnderstanding,
  deleteBusinessUnderstandingDraft,
  generateBusinessUnderstanding,
  loadBusinessUnderstandingDraft,
  saveBusinessUnderstandingDraft,
} from "../universalBusinessRuleService.js";
import { validateDraft } from "../../domain/chit/validation/ValidationService.js";

export const SMART_CHIT_MAX_BYTES = 15 * 1024 * 1024;
export const SMART_CHIT_ACCEPT = ".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf";
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);
const LOW_CONFIDENCE_THRESHOLD = 0.7;

export const REVIEW_FIELD_DEFINITIONS = Object.freeze([
  { key: "documentType", label: "Document type", type: "text" },
  { key: "receiptNumber", label: "Receipt / register number", type: "text" },
  { key: "chitName", label: "Chit name", type: "text" },
  { key: "memberName", label: "Member name", type: "text" },
  { key: "phoneNumber", label: "Phone number", type: "tel" },
  { key: "chitValue", label: "Chit value", type: "number" },
  { key: "installmentAmount", label: "Installment amount", type: "number" },
  { key: "memberCount", label: "Member count", type: "number" },
  { key: "duration", label: "Duration (months)", type: "number" },
  { key: "date", label: "Date", type: "date" },
  { key: "status", label: "Status", type: "text" },
]);

export function validateSmartChitFile(file) {
  if (!file?.name || !Number.isFinite(Number(file.size))) {
    return { valid: false, code: "INVALID_UPLOAD", message: "Choose a valid document to upload." };
  }
  if (file.size > SMART_CHIT_MAX_BYTES) {
    return { valid: false, code: "FILE_TOO_LARGE", message: "The selected document exceeds the 15 MB limit." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { valid: false, code: "UNSUPPORTED_FILE", message: "Choose a PNG, JPEG, WebP, or PDF document." };
  }
  return { valid: true, code: null, message: "" };
}

export function mapOCRResponseToReview(ocrResponse) {
  const extraction = ocrResponse?.extraction || {};
  const firstMember = Array.isArray(extraction.members) ? extraction.members[0] || {} : {};
  const values = {
    documentType: valueOrEmpty(ocrResponse?.documentType),
    receiptNumber: firstPresent(extraction.receiptNumber, extraction.registerNumber, extraction.referenceNumber),
    chitName: valueOrEmpty(extraction.chitName),
    memberName: firstPresent(extraction.memberName, firstMember.name, firstMember.memberName),
    phoneNumber: firstPresent(extraction.phoneNumber, extraction.contactNumber, firstMember.phone, firstMember.phoneNumber),
    chitValue: valueOrEmpty(extraction.chitValue),
    installmentAmount: firstPresent(extraction.monthlyInstallment, extraction.installmentAmount),
    memberCount: valueOrEmpty(extraction.memberCount),
    duration: firstPresent(extraction.durationMonths, extraction.duration),
    date: firstPresent(extraction.date, extraction.receiptDate, extraction.startDate),
    status: valueOrEmpty(extraction.status),
  };
  const fieldScores = ocrResponse?.confidence?.fieldScores || {};
  const missingFields = new Set(ocrResponse?.missingFields || []);
  const fields = Object.fromEntries(REVIEW_FIELD_DEFINITIONS.map((definition) => {
    const providerKey = providerFieldKey(definition.key);
    const confidence = numericConfidence(
      fieldScores[definition.key] ?? fieldScores[providerKey] ?? ocrResponse?.confidence?.overallScore
    );
    const value = values[definition.key];
    const missing = value === "" || value === null || value === undefined || missingFields.has(providerKey);
    return [definition.key, {
      ...definition,
      value: valueOrEmpty(value),
      extractedValue: valueOrEmpty(value),
      confidence,
      state: missing ? "missing" : confidence < LOW_CONFIDENCE_THRESHOLD ? "low-confidence" : "extracted",
      corrected: false,
    }];
  }));

  return {
    fields,
    rawText: String(ocrResponse?.rawText || ""),
    overallConfidence: numericConfidence(ocrResponse?.confidence?.overallScore),
    provider: String(ocrResponse?.provider || ""),
    documentId: ocrResponse?.documentId || null,
    warnings: Array.isArray(ocrResponse?.warnings) ? [...ocrResponse.warnings] : [],
  };
}

export async function extractSmartChitDocument({ file, activeTenantContext, signal } = {}, {
  generate = generateBusinessUnderstanding,
} = {}) {
  const validation = validateSmartChitFile(file);
  if (!validation.valid) throw captureError(validation.code, validation.message);
  const workspaceId = activeTenantContext?.workspace_id || activeTenantContext?.workspaceId;
  if (!workspaceId) {
    throw captureError("WORKSPACE_ACCESS_DENIED", "Select a valid business workspace before using Smart Chit Capture.", 403);
  }
  const result = await generate(file, { workspaceId, signal });
  if (!result.ocrResponse || result.extractionStatus !== "SUCCESS") {
    throw captureError("OCR_SCHEMA_INVALID", "The OCR response could not be prepared for review.");
  }
  return {
    ...result,
    review: mapOCRResponseToReview(result.ocrResponse),
  };
}

export function applyReviewValue(review, key, value) {
  const field = review?.fields?.[key];
  if (!field) return review;
  const normalized = value ?? "";
  return {
    ...review,
    fields: {
      ...review.fields,
      [key]: {
        ...field,
        value: normalized,
        corrected: String(normalized) !== String(field.extractedValue ?? ""),
        state: String(normalized).trim() === ""
          ? "missing"
          : String(normalized) !== String(field.extractedValue ?? "")
            ? "user-corrected"
            : field.confidence < LOW_CONFIDENCE_THRESHOLD ? "low-confidence" : "extracted",
      },
    },
  };
}

export async function buildReviewedDraft({ draft, review, file, activeTenantContext } = {}, {
  getSession = () => SupabaseAuthService.getSession(),
} = {}) {
  const formattedSession = await getSession();
  const authenticatedUserId = formattedSession?.user?.id;
  const workspaceId = activeTenantContext?.workspace_id || activeTenantContext?.workspaceId;
  if (!authenticatedUserId) throw captureError("SESSION_EXPIRED", "Your session has expired. Sign in again to continue.", 401);
  if (!workspaceId) throw captureError("WORKSPACE_ACCESS_DENIED", "Select a valid business workspace before saving.", 403);

  const values = Object.fromEntries(Object.entries(review?.fields || {}).map(([key, field]) => [key, emptyToNull(field.value)]));
  const corrections = Object.fromEntries(
    Object.entries(review?.fields || {})
      .filter(([, field]) => field.corrected)
      .map(([key, field]) => [key, { from: emptyToNull(field.extractedValue), to: emptyToNull(field.value) }])
  );
  const business = {
    chitName: values.chitName,
    chitValue: values.chitValue,
    grossInstallment: values.installmentAmount,
    memberCount: values.memberCount,
    duration: values.duration,
    startDate: values.date,
    contactNumber: values.phoneNumber,
  };
  const members = Array.isArray(draft?.members) ? draft.members.map((member) => ({ ...member })) : [];
  if (values.memberName || values.phoneNumber) {
    const first = members[0] || {};
    members[0] = {
      ...first,
      ...(values.memberName ? { name: values.memberName } : {}),
      ...(values.phoneNumber ? { phone: values.phoneNumber } : {}),
      isOwnerEdited: Boolean(review?.fields?.memberName?.corrected || review?.fields?.phoneNumber?.corrected),
    };
  }
  let corrected = applyOwnerCorrections(draft, { business, members }).draft;
  corrected = applyExplicitFixedScheduleCorrections(corrected, review);
  const source = corrected.extractionMetadata?.sourceDocument || {};
  const reviewedDraft = {
    ...corrected,
    extractionMetadata: {
      ...corrected.extractionMetadata,
      provider: review.provider,
      extractedAt: corrected.extractionMetadata?.extractedAt || new Date().toISOString(),
      rawText: review.rawText,
      sourceDocument: {
        ...source,
        provider: review.provider,
        documentId: review.documentId,
        documentType: values.documentType,
        originalFileName: file?.name || source.originalFileName || null,
        mimeType: file?.type || source.mimeType || null,
        fileSize: Number(file?.size ?? source.fileSize ?? 0),
        rawTextLength: review.rawText.length,
      },
      audit: {
        authenticatedUserId,
        workspaceId,
        originalFileName: file?.name || source.originalFileName || null,
        userCorrections: corrections,
        reviewedAt: new Date().toISOString(),
        reviewFields: {
          receiptNumber: values.receiptNumber,
          status: values.status,
        },
        reviewSnapshot: {
          fields: Object.fromEntries(Object.entries(review.fields).map(([key, field]) => [key, {
            value: field.value,
            extractedValue: field.extractedValue,
            confidence: field.confidence,
            state: field.state,
            corrected: field.corrected,
          }])),
          overallConfidence: review.overallConfidence,
          warnings: review.warnings,
        },
      },
    },
  };
  return { draft: reviewedDraft, validation: validateDraft(reviewedDraft), corrections };
}

export async function saveSmartChitDraft(input, dependencies = {}) {
  const reviewed = await buildReviewedDraft(input, dependencies);
  const saveDraftImpl = dependencies.saveDraftImpl || saveBusinessUnderstandingDraft;
  const saved = await saveDraftImpl(reviewed.draft, input.activeTenantContext);
  return { ...reviewed, saved };
}

export async function createSmartChitRecord(input, dependencies = {}) {
  const reviewed = await buildReviewedDraft(input, dependencies);
  const confirmImpl = dependencies.confirmImpl || confirmBusinessUnderstanding;
  const createImpl = dependencies.createImpl || createChitFromBusinessUnderstanding;
  const { draft: confirmedDraft, validation } = confirmImpl(reviewed.draft);
  const created = await createImpl(confirmedDraft, input.activeTenantContext, { saveTemplate: true });
  return { ...reviewed, draft: confirmedDraft, validation, created };
}

export async function loadSmartChitDraft(extractionId, activeTenantContext, dependencies = {}) {
  const loadDraftImpl = dependencies.loadDraftImpl || loadBusinessUnderstandingDraft;
  const saved = await loadDraftImpl(extractionId, activeTenantContext);
  if (!saved?.parsed_draft) return null;
  const draft = saved.parsed_draft;
  const audit = draft.extractionMetadata?.audit || {};
  const snapshot = audit.reviewSnapshot || {};
  const fields = Object.fromEntries(REVIEW_FIELD_DEFINITIONS.map((definition) => {
    const field = snapshot.fields?.[definition.key] || {};
    const value = valueOrEmpty(field.value);
    return [definition.key, {
      ...definition,
      value,
      extractedValue: valueOrEmpty(field.extractedValue),
      confidence: numericConfidence(field.confidence),
      state: field.state || (value === "" ? "missing" : "extracted"),
      corrected: Boolean(field.corrected),
    }];
  }));
  return {
    saved,
    draft,
    validation: validateDraft(draft),
    review: {
      fields,
      rawText: String(draft.extractionMetadata?.rawText || ""),
      overallConfidence: numericConfidence(snapshot.overallConfidence ?? draft.confidence?.overall),
      provider: String(saved.provider || draft.extractionMetadata?.provider || ""),
      documentId: draft.extractionMetadata?.sourceDocument?.documentId || saved.id,
      warnings: Array.isArray(snapshot.warnings) ? snapshot.warnings : [],
    },
    file: {
      name: saved.file_name || draft.extractionMetadata?.sourceDocument?.originalFileName || "Saved OCR document",
      type: saved.file_mime_type || draft.extractionMetadata?.sourceDocument?.mimeType || "application/octet-stream",
      size: Number(saved.file_size || draft.extractionMetadata?.sourceDocument?.fileSize || 0),
      persisted: true,
    },
  };
}

export async function deleteSmartChitDraft(extractionId, activeTenantContext, dependencies = {}) {
  const deleteDraftImpl = dependencies.deleteDraftImpl || deleteBusinessUnderstandingDraft;
  return deleteDraftImpl(extractionId, activeTenantContext);
}

export function smartChitErrorMessage(error) {
  const messages = {
    SESSION_EXPIRED: "Your session has expired. Sign in again to continue.",
    WORKSPACE_ACCESS_DENIED: "You do not have access to Smart Chit Capture in this workspace.",
    FILE_TOO_LARGE: "The selected document exceeds the 15 MB upload limit.",
    UNSUPPORTED_FILE: "Choose a PNG, JPEG, WebP, or PDF document.",
    INVALID_UPLOAD: "The uploaded document could not be validated.",
    OCR_RATE_LIMIT: "OCR is temporarily rate limited. Wait a moment and retry.",
    OCR_PROVIDER_UNAVAILABLE: "The OCR provider is temporarily unavailable. Please retry.",
    OCR_TIMEOUT: "OCR took too long. Check your connection and retry.",
    OCR_SCHEMA_INVALID: "The OCR response was malformed and could not be reviewed.",
    DOCUMENT_UNREADABLE: "No usable chit details were found. Try a clearer image.",
  };
  return messages[error?.code] || "Smart Chit Capture could not complete the request. Please retry.";
}

function providerFieldKey(key) {
  return ({ installmentAmount: "monthlyInstallment", duration: "durationMonths", date: "startDate", phoneNumber: "contactNumber" })[key] || key;
}

function firstPresent(...values) {
  return valueOrEmpty(values.find((value) => value !== null && value !== undefined && value !== ""));
}

function valueOrEmpty(value) {
  return value === null || value === undefined ? "" : value;
}

function emptyToNull(value) {
  return value === "" || value === undefined ? null : value;
}

function numericConfidence(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 1 ? number : 0;
}

function captureError(code, message, status = 0) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function applyExplicitFixedScheduleCorrections(draft, review) {
  const durationChanged = Boolean(review?.fields?.duration?.corrected);
  const amountChanged = Boolean(review?.fields?.installmentAmount?.corrected);
  const existing = Array.isArray(draft.schedule) ? draft.schedule : [];
  if (!durationChanged && !amountChanged && existing.length > 0) return draft;
  const pattern = String(draft?.business?.installmentPattern?.value || "").toUpperCase();
  const duration = Number(review?.fields?.duration?.value);
  const amount = Number(review?.fields?.installmentAmount?.value);
  if (pattern !== "FIXED_MONTHLY" || !Number.isInteger(duration) || duration <= 0 || !Number.isFinite(amount) || amount <= 0) {
    return draft;
  }
  return {
    ...draft,
    schedule: Array.from({ length: duration }, (_, index) => ({
      nonLiftedPayment: null,
      liftedPayment: null,
      prizeAmount: null,
      commissionValue: null,
      deposit: null,
      dividendPerMember: null,
      penalty: null,
      bidAmount: null,
      otherDeductions: null,
      netAmount: null,
      ...(existing[index] || existing.at(-1) || {}),
      monthNumber: index + 1,
      standardPayment: amount,
      evidence: existing[index]?.evidence || "Derived from explicit fixed-monthly duration and installment evidence",
      isOwnerEdited: true,
    })),
  };
}
