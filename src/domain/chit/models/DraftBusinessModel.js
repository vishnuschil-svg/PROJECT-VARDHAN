/**
 * DraftBusinessModel
 *
 * The single source of truth between AI document understanding and chit creation.
 *
 * AI Document Intelligence population rules:
 *   1. ONLY populate this model.
 *   2. NEVER create chit groups, members, ledgers, collections, or financial rules.
 *   3. NEVER fabricate values. NEVER default missing values to 0.
 *
 * Validation pipeline:
 *   DraftBusinessModel → ValidationService → { VALID | INVALID | NEEDS_OWNER_CONFIRMATION }
 *
 * Only when VALID → "Create Chit Group" is enabled → Owner confirms → ERP records created.
 */

import { VALUE_STATE, RULE_STATE } from "../services/UniversalBusinessRuleEngine.js";

/**
 * Create a clean DraftBusinessModel with all fields in NOT_FOUND/NOT_DETECTED state.
 * No values are assumed. Every field starts as unknown.
 */
export function createEmptyDraft() {
  return {
    // Core business fields
    business: {
      chitName: { value: null, state: VALUE_STATE.NOT_FOUND },
      chitValue: { value: null, state: VALUE_STATE.NOT_FOUND },
      memberCount: { value: null, state: VALUE_STATE.NOT_FOUND },
      duration: { value: null, state: VALUE_STATE.NOT_FOUND },
      installmentPattern: { value: null, state: VALUE_STATE.NOT_FOUND },
      grossInstallment: { value: null, state: VALUE_STATE.NOT_FOUND },
      installmentMode: { value: null, state: VALUE_STATE.NOT_FOUND },
      startDate: { value: null, state: VALUE_STATE.NOT_FOUND },
      endDate: { value: null, state: VALUE_STATE.NOT_FOUND },
      foremanCommissionPercent: { value: null, state: VALUE_STATE.NOT_FOUND },
      minimumDiscountPercent: { value: null, state: VALUE_STATE.NOT_FOUND },
      maximumDiscountPercent: { value: null, state: VALUE_STATE.NOT_FOUND },
      prizeAmount: { value: null, state: VALUE_STATE.NOT_FOUND },
      auctionPattern: { value: null, state: VALUE_STATE.NOT_FOUND },
      organizerName: { value: null, state: VALUE_STATE.NOT_FOUND },
      contactNumber: { value: null, state: VALUE_STATE.NOT_FOUND },
      fractionalTicketInformation: { value: null, state: VALUE_STATE.NOT_FOUND },
      specialRules: { value: null, state: VALUE_STATE.NOT_FOUND },
      notes: { value: null, state: VALUE_STATE.NOT_FOUND },
    },

    // Financial primitives (NEVER assumed — only extracted from document)
    financialPrimitives: {
      commission: { value: null, state: VALUE_STATE.NOT_FOUND },
      deposit: { value: null, state: VALUE_STATE.NOT_FOUND },
      dividend: { value: null, state: VALUE_STATE.NOT_FOUND },
      penalty: { value: null, state: VALUE_STATE.NOT_FOUND },
      bidRule: { value: null, state: VALUE_STATE.NOT_FOUND },
      prizeRule: { value: null, state: VALUE_STATE.NOT_FOUND },
      liftRule: { value: null, state: VALUE_STATE.NOT_FOUND },
    },

    // Members (always an array)
    members: [],

    // Month-wise schedule (always an array)
    schedule: [],

    // Detected business rules
    rules: {
      detected: [],
      notDetected: [],
    },

    // Evidence traces for every extracted value
    evidence: {
      business: {},
      financialPrimitives: {},
      rules: {},
      scheduleRows: [],
      members: [],
    },

    // Confidence scores
    confidence: {
      overall: 0,
      business: {},
      financialPrimitives: {},
      rules: {},
      schedule: 0,
      members: 0,
    },

    // Extraction metadata (never mutable by owner)
    extractionMetadata: {
      sourceDocument: {
        provider: null,
        rawTextLength: 0,
        documentId: null,
        languageDetected: "UNKNOWN",
        confidenceScore: 0,
        originalFileName: null,
        mimeType: null,
        fileSize: 0,
        name: null,
        type: null,
        size: 0,
        documentType: null,
      },
      provider: null,
      extractedAt: null,
      rawTextLength: 0,
    },

    // Workspace state (mutable by owner during review)
    workspace: {
      status: "DRAFT",           // DRAFT → NEEDS_REVIEW → OWNER_APPROVED
      validationStatus: null,    // null | "VALID" | "INVALID" | "NEEDS_OWNER_CONFIRMATION" | "UNSUPPORTED_PATTERN"
      validationErrors: [],
      ownerConfirmed: false,
      ownerChanges: [],
      auditLog: [],
    },
  };
}

/**
 * Build a DraftBusinessModel from the Universal Business Rule Engine normalized JSON.
 * This is the ONLY way AI populates the draft — it NEVER creates records directly.
 */
export function buildDraftFromNormalizedJSON(normalizedJSON) {
  const draft = createEmptyDraft();

  if (!normalizedJSON) return draft;

  // 1. Populate business fields
  const business = normalizedJSON.Business || {};
  Object.keys(draft.business).forEach((key) => {
    if (business[key]) {
      draft.business[key] = {
        value: business[key].value ?? null,
        state: business[key].state || VALUE_STATE.NOT_FOUND,
      };
    }
  });

  // 2. Populate financial primitives from schedule evidence if available
  const schedule = Array.isArray(normalizedJSON["Month Schedule"]) ? normalizedJSON["Month Schedule"] : [];
  const detectedRules = Array.isArray(normalizedJSON["Detected Rules"]) ? normalizedJSON["Detected Rules"] : [];

  // Installment pattern belongs to the business draft boundary. Derive it only
  // from explicit month-wise payment values; never assume it from chit value.
  if (draft.business.installmentPattern.state === VALUE_STATE.NOT_FOUND) {
    const payments = schedule
      .map((row) => row?.standardPayment)
      .filter((value) => value !== null && value !== undefined && value !== "");
    if (payments.length === schedule.length && payments.length > 0) {
      draft.business.installmentPattern = {
        value: new Set(payments.map(Number)).size === 1 ? "FIXED_MONTHLY" : "VARIABLE_MONTHLY",
        state: VALUE_STATE.FOUND,
      };
    }
  }

  // Check schedule for financial evidence
  if (schedule.length > 0) {
    const hasCommission = schedule.some((r) => r.commissionValue !== null);
    const hasDeposit = schedule.some((r) => r.deposit !== null);
    const hasDividend = schedule.some((r) => r.dividendPerMember !== null);
    const hasPenalty = schedule.some((r) => r.penalty !== null);
    const hasBid = schedule.some((r) => r.bidAmount !== null);
    const hasPrize = schedule.some((r) => r.prizeAmount !== null);
    const hasLift = schedule.some((r) => r.nonLiftedPayment !== null || r.liftedPayment !== null);

    draft.financialPrimitives.commission.state = hasCommission ? VALUE_STATE.FOUND : VALUE_STATE.NOT_FOUND;
    draft.financialPrimitives.deposit.state = hasDeposit ? VALUE_STATE.FOUND : VALUE_STATE.NOT_FOUND;
    draft.financialPrimitives.dividend.state = hasDividend ? VALUE_STATE.FOUND : VALUE_STATE.NOT_FOUND;
    draft.financialPrimitives.penalty.state = hasPenalty ? VALUE_STATE.FOUND : VALUE_STATE.NOT_FOUND;
    draft.financialPrimitives.bidRule.state = hasBid ? VALUE_STATE.FOUND : VALUE_STATE.NOT_FOUND;
    draft.financialPrimitives.prizeRule.state = hasPrize ? VALUE_STATE.FOUND : VALUE_STATE.NOT_FOUND;
    draft.financialPrimitives.liftRule.state = hasLift ? VALUE_STATE.FOUND : VALUE_STATE.NOT_FOUND;
  }

  // Check detected rules for financial rule evidence
  detectedRules.forEach((rule) => {
    const key = mapRuleKeyToFinancialPrimitive(rule.key);
    if (key && rule.state !== RULE_STATE.NOT_DETECTED) {
      draft.financialPrimitives[key].state = VALUE_STATE.FOUND;
      draft.financialPrimitives[key].value = rule.ownerConfirmed ? "Confirmed" : null;
    }
  });

  // 3. Populate members
  draft.members = Array.isArray(normalizedJSON.Members) ? normalizedJSON.Members.map((m) => ({ ...m })) : [];

  // 4. Populate schedule
  draft.schedule = schedule.map((row) => ({ ...row }));

  // 5. Populate rules
  draft.rules.detected = detectedRules.map((r) => ({ ...r }));
  draft.rules.notDetected = Array.isArray(normalizedJSON["Unknown Rules"])
    ? normalizedJSON["Unknown Rules"].map((r) => ({ ...r }))
    : [];

  // 6. Populate evidence
  draft.evidence = {
    business: { ...(normalizedJSON.Evidence?.business || {}) },
    financialPrimitives: buildFinancialPrimitiveEvidence(draft.financialPrimitives, schedule, detectedRules),
    rules: { ...(normalizedJSON.Evidence?.rules || {}) },
    scheduleRows: Array.isArray(normalizedJSON.Evidence?.scheduleRows)
      ? [...normalizedJSON.Evidence.scheduleRows]
      : schedule.map((_, i) => `Schedule row ${i + 1}`),
    members: Array.isArray(normalizedJSON.Evidence?.members)
      ? [...normalizedJSON.Evidence.members]
      : [],
  };

  // 7. Populate confidence
  draft.confidence = {
    overall: normalizedJSON.Confidence?.overall ?? 0,
    business: { ...(normalizedJSON.Confidence?.business || {}) },
    financialPrimitives: buildFinancialPrimitiveConfidence(draft.financialPrimitives),
    rules: { ...(normalizedJSON.Confidence?.rules || {}) },
    schedule: normalizedJSON.Confidence?.scheduleRows ?? 0,
    members: normalizedJSON.Confidence?.members ?? 0,
  };

  // 8. Populate extraction metadata
  const sourceDoc = normalizedJSON.sourceDocument || {};
  draft.extractionMetadata = {
    sourceDocument: {
      provider: sourceDoc.provider || "manual",
      rawTextLength: Number(sourceDoc.rawTextLength || 0),
      documentId: sourceDoc.documentId || null,
      languageDetected: sourceDoc.languageDetected || "UNKNOWN",
      confidenceScore: Number(sourceDoc.confidenceScore || 0),
      originalFileName: sourceDoc.originalFileName || sourceDoc.name || null,
      mimeType: sourceDoc.mimeType || sourceDoc.type || null,
      fileSize: Number(sourceDoc.fileSize ?? sourceDoc.size ?? 0),
      fieldScores: { ...(sourceDoc.fieldScores || {}) },
      requiresHumanReview: Boolean(sourceDoc.requiresHumanReview),
      warnings: Array.isArray(sourceDoc.warnings) ? [...sourceDoc.warnings] : [],
      name: sourceDoc.name || null,
      type: sourceDoc.type || null,
      size: sourceDoc.size || 0,
      documentType: sourceDoc.documentType || null,
    },
    provider: sourceDoc.provider || "manual",
    extractedAt: normalizedJSON.generatedAt || new Date().toISOString(),
    rawTextLength: Number(sourceDoc.rawTextLength || 0),
  };

  // 9. Update workspace status
  draft.workspace.status = "NEEDS_REVIEW";
  draft.workspace.auditLog = [
    ...(Array.isArray(normalizedJSON.workspace?.auditLog) ? normalizedJSON.workspace.auditLog : []),
    { action: "DRAFT_CREATED", at: new Date().toISOString(), details: { source: "UBRE" } },
  ];

  return draft;
}

/**
 * Apply owner corrections to the DraftBusinessModel.
 * Only updates fields the owner explicitly touches.
 */
export function applyOwnerCorrectionsToDraft(draft, corrections = {}) {
  const updated = JSON.parse(JSON.stringify(draft));

  // Update business fields
  Object.entries(corrections.business || {}).forEach(([key, value]) => {
    if (updated.business[key] !== undefined) {
      const hasValue = value !== null && value !== undefined && value !== "";
      updated.business[key] = {
        value: hasValue ? value : null,
        state: hasValue ? VALUE_STATE.OWNER_DEFINED : VALUE_STATE.NOT_FOUND,
      };
    }
  });

  // Update financial primitives
  Object.entries(corrections.financialPrimitives || {}).forEach(([key, value]) => {
    if (updated.financialPrimitives[key] !== undefined) {
      const hasValue = value !== null && value !== undefined && value !== "";
      updated.financialPrimitives[key] = {
        value: hasValue ? value : null,
        state: hasValue ? VALUE_STATE.OWNER_DEFINED : VALUE_STATE.NOT_FOUND,
      };
    }
  });

  // Update rule confirmations
  (corrections.rules || []).forEach(({ key, confirmed }) => {
    const detected = updated.rules.detected.find((r) => r.key === key);
    if (detected) {
      detected.ownerConfirmed = confirmed;
      detected.state = confirmed ? RULE_STATE.OWNER_CONFIRMED : detected.state;
      detected.confidence = confirmed ? 1 : detected.confidence;
    }
    const notDetected = updated.rules.notDetected.find((r) => r.key === key);
    if (notDetected && confirmed) {
      notDetected.ownerConfirmed = confirmed;
      notDetected.state = RULE_STATE.OWNER_CONFIRMED;
      notDetected.confidence = 1;
      notDetected.evidence = ["Owner confirmed"];
    }
  });

  // Update schedule
  if (corrections.schedule) {
    updated.schedule = corrections.schedule.map((row, i) => {
      const existing = updated.schedule[i] || {};
      return { ...existing, ...row, isOwnerEdited: true };
    });
  }

  // Update members
  if (corrections.members) {
    updated.members = corrections.members.map((m, i) => {
      const existing = updated.members[i] || {};
      return { ...existing, ...m, isOwnerEdited: true };
    });
  }

  // Log the change
  updated.workspace.ownerChanges.push({
    at: new Date().toISOString(),
    corrections: Object.keys(corrections),
  });
  updated.workspace.auditLog.push({
    action: "OWNER_CORRECTION",
    at: new Date().toISOString(),
    details: { fields: Object.keys(corrections.business || {}) },
  });

  return updated;
}

/**
 * Confirm the draft as owner-approved.
 */
export function confirmDraft(draft) {
  return {
    ...draft,
    workspace: {
      ...draft.workspace,
      status: "OWNER_APPROVED",
      ownerConfirmed: true,
      confirmedAt: new Date().toISOString(),
      auditLog: [
        ...draft.workspace.auditLog,
        { action: "OWNER_APPROVED", at: new Date().toISOString(), details: {} },
      ],
    },
  };
}

/**
 * Map a rule key from the UBRE to a financial primitive key.
 */
function mapRuleKeyToFinancialPrimitive(ruleKey) {
  const map = {
    hasCommission: "commission",
    hasDeposit: "deposit",
    hasDividend: "dividend",
    hasPenalty: "penalty",
    hasBidding: "bidRule",
    prizePayout: "prizeRule",
    liftMechanism: "liftRule",
  };
  return map[ruleKey] || null;
}

/**
 * Build evidence strings for financial primitives.
 */
function buildFinancialPrimitiveEvidence(financialPrimitives, schedule, _detectedRules) {
  const evidence = {};
  Object.keys(financialPrimitives).forEach((key) => {
    const state = financialPrimitives[key].state;
    if (state === VALUE_STATE.FOUND) {
      // Find schedule evidence
      const scheduleField = mapFinancialPrimitiveToScheduleField(key);
      if (scheduleField && schedule.some((r) => r[scheduleField] !== null)) {
        evidence[key] = `Found in ${schedule.filter((r) => r[scheduleField] !== null).length} schedule rows`;
      } else {
        evidence[key] = "Detected in document";
      }
    } else {
      evidence[key] = "Not found in document";
    }
  });
  return evidence;
}

/**
 * Build confidence scores for financial primitives.
 */
function buildFinancialPrimitiveConfidence(financialPrimitives) {
  const confidence = {};
  Object.keys(financialPrimitives).forEach((key) => {
    confidence[key] = financialPrimitives[key].state === VALUE_STATE.FOUND ? 0.85 : 0;
  });
  return confidence;
}

/**
 * Map a financial primitive key to its schedule field name.
 */
function mapFinancialPrimitiveToScheduleField(key) {
  const map = {
    commission: "commissionValue",
    deposit: "deposit",
    dividend: "dividendPerMember",
    penalty: "penalty",
    bidRule: "bidAmount",
    prizeRule: "prizeAmount",
    liftRule: "liftedPayment",
  };
  return map[key] || null;
}

export default {
  createEmptyDraft,
  buildDraftFromNormalizedJSON,
  applyOwnerCorrectionsToDraft,
  confirmDraft,
};
