import { ExternalOCRProviderAdapter, OCRProviderError } from "../ai/providers/ExternalOCRProviderAdapter.js";
import { ChitDocumentUnderstandingEngine } from "../domain/chit/services/ChitDocumentUnderstandingEngine.js";
import { parseChitNaturalText } from "../domain/chit/parsers/ChitNaturalTextParser.js";

export const EXTRACTION_STATUS = Object.freeze({
  SUCCESS: "SUCCESS",
  OCR_NOT_CONFIGURED: "OCR_NOT_CONFIGURED",
  OCR_TIMEOUT: "OCR_TIMEOUT",
  OCR_RATE_LIMIT: "OCR_RATE_LIMIT",
  OCR_PROVIDER_UNAVAILABLE: "OCR_PROVIDER_UNAVAILABLE",
  OCR_FAILED: "OCR_FAILED",
  OCR_SCHEMA_INVALID: "OCR_SCHEMA_INVALID",
  DOCUMENT_UNREADABLE: "DOCUMENT_UNREADABLE",
  MANUAL_FALLBACK_USED: "MANUAL_FALLBACK_USED",
});

export class DocumentExtractionError extends Error {
  constructor(code, message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = "DocumentExtractionError";
    this.code = Object.values(EXTRACTION_STATUS).includes(code) ? code : EXTRACTION_STATUS.OCR_FAILED;
    this.retryable = Boolean(options.retryable);
  }
}

/**
 * Canonical file-to-evidence boundary used by both document services.
 * It extracts evidence only; UBRE remains the deterministic normalizer.
 */
export async function extractDocumentEvidence(file, {
  manualText = "",
  members = [],
  workspaceId,
  documentType = "CHIT_REGISTER",
  languageHint = "UNKNOWN",
  ocrAdapter = ExternalOCRProviderAdapter,
  signal,
} = {}) {
  const validation = ChitDocumentUnderstandingEngine.validateFile(file);
  if (!validation.valid) {
    throw new DocumentExtractionError(
      EXTRACTION_STATUS.OCR_FAILED,
      validation.errors.join(" ")
    );
  }

  if (validation.extension === "json") {
    const rawText = await file.text();
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (error) {
      throw new DocumentExtractionError(
        EXTRACTION_STATUS.OCR_SCHEMA_INVALID,
        "The JSON document is invalid.",
        { cause: error }
      );
    }
    const rows = extractRows(parsed);
    if (rows.length === 0 && !Array.isArray(parsed)) rows.push(...deriveExplicitFixedSchedule(parsed.extraction || parsed));
    return buildEvidence({
      rawText,
      rows,
      members,
      structuredExtraction: Array.isArray(parsed) ? null : parsed.extraction || parsed,
      provider: "deterministic-json",
      status: EXTRACTION_STATUS.SUCCESS,
      file,
    });
  }

  if (validation.extension === "csv") {
    const rawText = await file.text();
    return buildEvidence({
      rawText,
      rows: parseCSV(rawText),
      members,
      provider: "deterministic-csv",
      status: EXTRACTION_STATUS.SUCCESS,
      file,
    });
  }

  if (validation.requiresExternalProvider) {
    try {
      const result = await ocrAdapter.extract(file, {
        workspaceId,
        documentType,
        languageHint,
        signal,
      });
      const normalizedProviderEvidence = normalizeProviderEvidence(result);
      return buildEvidence({
        rawText: result.rawText,
        rows: normalizedProviderEvidence.rows,
        members: normalizedProviderEvidence.members,
        structuredExtraction: normalizedProviderEvidence.structuredExtraction,
        provider: result.provider,
        status: EXTRACTION_STATUS.SUCCESS,
        file,
        providerResponse: result,
        providerMetadata: {
          provider: result.provider,
          rawTextLength: result.rawText.length,
          documentId: result.documentId,
          documentType: result.documentType,
          languageDetected: result.languageDetected,
          confidenceScore: result.confidence.overallScore,
          fieldScores: result.confidence.fieldScores,
          fieldResults: result.extraction.fieldResults || {},
          unrecognizedText: result.extraction.unrecognizedText || [],
          requiresHumanReview: result.confidence.requiresHumanReview || normalizedProviderEvidence.usedRawTextFallback,
          mathValidated: result.confidence.mathValidated,
          missingFields: result.missingFields,
          warnings: [
            ...(result.warnings || []),
            ...(normalizedProviderEvidence.usedRawTextFallback
              ? ["Structured OCR was unavailable; visible provider text was parsed deterministically."]
              : []),
          ],
        },
      });
    } catch (error) {
      if (!manualText.trim()) throw toDocumentError(error);
      return manualFallback(file, manualText, members, error);
    }
  }

  if (validation.requiresSpreadsheetProvider && !manualText.trim()) {
    throw new DocumentExtractionError(
      EXTRACTION_STATUS.OCR_NOT_CONFIGURED,
      "Spreadsheet extraction is unavailable. Enter the chit details manually."
    );
  }

  return manualFallback(file, manualText, members);
}


function normalizeProviderEvidence(result) {
  const providerExtraction = result?.extraction && typeof result.extraction === "object"
    ? result.extraction
    : {};
  let rows = Array.isArray(providerExtraction.installmentSchedule)
    ? providerExtraction.installmentSchedule
    : [];
  const members = Array.isArray(providerExtraction.members)
    ? providerExtraction.members
    : [];
  const rawText = String(result?.rawText || "").trim();
  const parsed = rawText ? parseChitNaturalText(rawText) : {};
  const fieldScores = result?.confidence?.fieldScores || {};
  const fieldResults = providerExtraction.fieldResults || {};

  const fieldQuality = (key) => {
    const resultItem = fieldResults?.[key] || {};
    const score = Number(resultItem.confidence ?? fieldScores?.[key] ?? 0);
    const status = String(resultItem.status || "").toUpperCase();
    const hasEvidence = Boolean(String(resultItem.sourceText || "").trim());
    return { score: Number.isFinite(score) ? score : 0, status, hasEvidence };
  };
  const missing = (value) => value === null || value === undefined || value === "" || value === "UNKNOWN";
  const choose = (key, providerValue, parsedValue) => {
    if (missing(providerValue)) return missing(parsedValue) ? null : parsedValue;
    if (missing(parsedValue)) return providerValue;
    const quality = fieldQuality(key);
    if (["AMBIGUOUS", "INVALID", "NOT_FOUND"].includes(quality.status)) return parsedValue;
    if (quality.score > 0 && quality.score < 0.7) return parsedValue;
    return providerValue;
  };

  let durationMonths = choose("durationMonths", providerExtraction.durationMonths, parsed.duration);
  const memberCount = choose("memberCount", providerExtraction.memberCount, parsed.memberCount);
  const parsedDuration = Number(parsed.duration);
  const providerDuration = Number(providerExtraction.durationMonths);
  const providerMemberCount = Number(providerExtraction.memberCount);
  const durationQuality = fieldQuality("durationMonths");
  const explicitParsedDuration = Number.isInteger(parsedDuration) && parsedDuration > 0;
  const suspiciousDuration = (
    rows.length === 0
    && explicitParsedDuration
    && Number.isFinite(providerDuration)
    && providerDuration !== parsedDuration
    && (
      providerDuration === providerMemberCount
      || durationQuality.status === "AMBIGUOUS"
      || durationQuality.status === "INVALID"
      || (durationQuality.score > 0 && durationQuality.score < 0.8)
      || !durationQuality.hasEvidence
    )
  );
  if (suspiciousDuration) durationMonths = parsedDuration;

  const structuredExtraction = {
    ...providerExtraction,
    chitName: choose("chitName", providerExtraction.chitName, parsed.chitName),
    chitCode: choose("chitCode", providerExtraction.chitCode, parsed.chitCode),
    organizerName: choose("organizerName", providerExtraction.organizerName, parsed.organizerName),
    chitValue: choose("chitValue", providerExtraction.chitValue, parsed.chitValue),
    durationMonths,
    memberCount,
    monthlyInstallment: choose("monthlyInstallment", providerExtraction.monthlyInstallment, parsed.monthlyPayment),
    installmentPattern: providerExtraction.installmentPattern && providerExtraction.installmentPattern !== "UNKNOWN"
      ? providerExtraction.installmentPattern
      : parsed.installmentPattern,
    startDate: choose("startDate", providerExtraction.startDate, parsed.startDate),
    endDate: choose("endDate", providerExtraction.endDate, parsed.endDate),
    members,
    installmentSchedule: rows,
  };

  if (rows.length === 0) rows = deriveExplicitFixedSchedule(structuredExtraction);
  structuredExtraction.installmentSchedule = rows;

  const usedRawTextFallback = Boolean(rawText) && [
    "chitName", "chitCode", "organizerName", "chitValue", "durationMonths",
    "memberCount", "monthlyInstallment", "startDate", "endDate",
  ].some((key) => structuredExtraction[key] !== providerExtraction[key])
    || (rows.length > 0 && (!providerExtraction.installmentSchedule || providerExtraction.installmentSchedule.length === 0));

  return { structuredExtraction, rows, members, usedRawTextFallback };
}

function manualFallback(file, manualText, members, providerError) {
  const rawText = String(manualText || "").trim();
  if (!rawText) {
    throw new DocumentExtractionError(
      EXTRACTION_STATUS.DOCUMENT_UNREADABLE,
      "No readable document details or manual fallback text were provided."
    );
  }
  let parsed = null;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    parsed = parseChitNaturalText(rawText);
  }
  const rows = extractRows(parsed);
  if (rows.length === 0) rows.push(...deriveExplicitFixedSchedule(parsed));
  return buildEvidence({
    rawText,
    rows,
    members: Array.isArray(parsed?.members) ? parsed.members : members,
    structuredExtraction: Array.isArray(parsed) ? null : parsed,
    provider: "manual-fallback",
    status: EXTRACTION_STATUS.MANUAL_FALLBACK_USED,
    file,
    providerMetadata: {
      provider: "manual-fallback",
      rawTextLength: rawText.length,
      documentType: "MANUAL",
      languageDetected: "UNKNOWN",
      confidenceScore: 0.75,
      warnings: providerError ? [`${providerError.code || "OCR_FAILED"}: manual fallback used.`] : [],
      requiresHumanReview: true,
    },
  });
}

function buildEvidence(value) {
  return {
    rawText: String(value.rawText || ""),
    rows: Array.isArray(value.rows) ? value.rows : [],
    members: Array.isArray(value.members) ? value.members : [],
    structuredExtraction: value.structuredExtraction || null,
    provider: value.provider,
    providerMetadata: value.providerMetadata || {
      provider: value.provider,
      rawTextLength: String(value.rawText || "").length,
      documentType: "UNKNOWN",
      languageDetected: "UNKNOWN",
      confidenceScore: value.provider?.startsWith("deterministic") ? 1 : 0.75,
      requiresHumanReview: !value.provider?.startsWith("deterministic"),
      warnings: [],
    },
    status: value.status,
    providerResponse: value.providerResponse || null,
  };
}

function extractRows(parsed) {
  if (Array.isArray(parsed)) return parsed;
  return parsed?.installmentSchedule || parsed?.schedule || parsed?.rows || parsed?.["Month Schedule"] || [];
}

function deriveExplicitFixedSchedule(parsed) {
  const duration = Number(parsed?.durationMonths ?? parsed?.duration);
  const amount = Number(parsed?.monthlyInstallment ?? parsed?.monthlyPayment);
  if (
    parsed?.installmentPattern !== "FIXED_MONTHLY"
    || !Number.isInteger(duration)
    || duration <= 0
    || !Number.isFinite(amount)
    || amount <= 0
  ) return [];
  return Array.from({ length: duration }, (_, index) => ({
    monthNumber: index + 1,
    standardPayment: amount,
    confidence: 0.75,
    evidence: "Derived from explicit fixed-monthly amount and duration",
  }));
}

function toDocumentError(error) {
  if (error instanceof DocumentExtractionError) return error;
  if (error instanceof OCRProviderError) {
    return new DocumentExtractionError(error.code, error.message, {
      retryable: error.retryable,
      cause: error,
    });
  }
  return new DocumentExtractionError(
    EXTRACTION_STATUS.OCR_FAILED,
    "Document extraction failed.",
    { retryable: true, cause: error }
  );
}

export function parseCSV(text) {
  const lines = String(text).split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = splitCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCSVLine(line);
    return Object.fromEntries(headers.map((header, index) => [
      header.trim(),
      values[index]?.trim() || "",
    ]));
  });
}

function splitCSVLine(line) {
  return String(line)
    .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map((value) => value.replace(/^"|"$/g, ""));
}
