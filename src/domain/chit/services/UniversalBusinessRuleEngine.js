/**
 * Universal Business Rule Engine
 *
 * Core principle: Extract objective facts only. Never fabricate values.
 * Never calculate financial values. Never assume commission, bidding, or penalty.
 *
 * Three states for every value:
 *   FOUND        — extracted from document with evidence
 *   NOT_FOUND    — not mentioned in document (remains null, never 0)
 *   OWNER_DEFINED — owner entered after review
 *
 * Output: One normalized JSON with sections:
 *   - Business
 *   - Members (always Array)
 *   - Month Schedule (always Array)
 *   - Detected Rules (always Array)
 *   - Unknown Rules (always Array)
 *   - Confidence
 *   - Evidence (always has business{}, rules{}, scheduleRows[], members[])
 *
 * SAFETY: Every iterable field is guarded to always return [].
 * If data is missing, never {}, never undefined.
 */

import { parseChitNaturalText, parseInstallmentPattern } from "../parsers/ChitNaturalTextParser.js";

export const VALUE_STATE = Object.freeze({
  FOUND: "FOUND",
  NOT_FOUND: "NOT_FOUND",
  OWNER_DEFINED: "OWNER_DEFINED",
});

export const RULE_STATE = Object.freeze({
  DETECTED: "DETECTED",
  NOT_DETECTED: "NOT_DETECTED",
  AMBIGUOUS: "AMBIGUOUS",
  OWNER_CONFIRMED: "OWNER_CONFIRMED",
});

const DOCUMENT_TYPE_PATTERNS = [
  { pattern: "receipt", label: "Receipt" },
  { pattern: "ledger", label: "Ledger" },
  { pattern: "member", label: "Member Sheet" },
  { pattern: "terms", label: "Terms and Conditions" },
  { pattern: "rule", label: "Rules Sheet" },
  { pattern: "comparison", label: "Multi-plan Comparison" },
  { pattern: "daily", label: "Daily Collection Plan" },
  { pattern: "auction", label: "Auction Plan" },
  { pattern: "poster", label: "Chit Poster" },
  { pattern: "schedule", label: "Month-wise Schedule" },
  { pattern: "plan", label: "Chit Plan" },
  { pattern: "promo", label: "Promotional Plan" },
  { pattern: "voice", label: "Voice Note Transcript" },
  { pattern: "transcript", label: "Voice Note Transcript" },
];

// Business fields that are NEVER assumed — must have document evidence
const BUSINESS_FIELDS = [
  { key: "chitName", label: "Chit Name", type: "string", aliases: ["chitname", "chit_name", "name", "scheme name", "scheme_name"] },
  { key: "chitValue", label: "Chit Value", type: "number", aliases: ["chitvalue", "chit_value", "value", "total value", "total_value", "chit amount", "chit_amount"] },
  { key: "memberCount", label: "Member Count", type: "number", aliases: ["membercount", "members", "total_members", "no of members", "number_of_members"] },
  { key: "duration", label: "Duration (Months)", type: "number", aliases: ["duration", "months", "total_months", "period", "tenure"] },
  { key: "installmentPattern", label: "Installment Pattern", type: "pattern", aliases: ["installmentpattern", "installment_pattern", "paymentpattern", "payment_pattern", "pattern"] },
  { key: "grossInstallment", label: "Gross Installment", type: "number", aliases: ["grossinstallment", "monthlyinstallment", "monthlypayment", "installmentamount"] },
  { key: "installmentMode", label: "Installment Mode", type: "string", aliases: ["installmentmode", "fixedorvariable", "paymentmode"] },
  { key: "startDate", label: "Start Date", type: "string", aliases: ["start_date", "startdate", "commencement", "commencement_date"] },
  { key: "endDate", label: "End Date", type: "string", aliases: ["end_date", "enddate", "closing date", "closing_date"] },
  { key: "foremanCommissionPercent", label: "Foreman Commission", type: "number", aliases: ["foremancommissionpercent", "commissionpercent", "organizercommission"] },
  { key: "minimumDiscountPercent", label: "Minimum Discount", type: "number", aliases: ["minimumdiscountpercent", "mindiscount", "minimumdiscount"] },
  { key: "maximumDiscountPercent", label: "Maximum Discount", type: "number", aliases: ["maximumdiscountpercent", "maxdiscount", "maximumdiscount"] },
  { key: "prizeAmount", label: "Prize Amount", type: "number", aliases: ["prizeamount", "prizemoney", "prize"] },
  { key: "auctionPattern", label: "Auction / Lucky Draw Pattern", type: "string", aliases: ["auctionpattern", "winnerselection", "luckydrawpattern"] },
  { key: "organizerName", label: "Organizer Name", type: "string", aliases: ["organizername", "foremanname", "organizer"] },
  { key: "contactNumber", label: "Contact Number", type: "string", aliases: ["contactnumber", "mobile", "phone"] },
  { key: "fractionalTicketInformation", label: "Fractional Ticket Information", type: "string", aliases: ["fractionalticketinformation", "fractionalticket", "shares"] },
  { key: "specialRules", label: "Special Rules", type: "string", aliases: ["specialrules", "terms", "conditions"] },
  { key: "notes", label: "Notes", type: "string", aliases: ["notes", "remarks"] },
];

// Rules that are ONLY detected with clear document evidence
// Commission, bidding, and penalty are NEVER assumed — only detected if explicitly mentioned
const DETECTABLE_RULES = [
  {
    key: "paymentPattern",
    label: "Payment Pattern",
    description: "How members pay each month",
    keywords: ["fixed", "variable", "month wise", "month-wise", "equal", "different each month"],
  },
  {
    key: "winnerSelection",
    label: "Winner Selection Method",
    description: "How winners are selected each month",
    keywords: ["auction", "bid", "premium", "lucky draw", "lottery", "draw"],
  },
  {
    key: "prizePayout",
    label: "Prize Payout Method",
    description: "How prize money is distributed",
    keywords: ["prize", "payout", "prize money", "prize amount", "award", "winning"],
  },
  {
    key: "liftMechanism",
    label: "Lift / Non-lift Mechanism",
    description: "Payment changes after a member wins",
    keywords: ["lift", "after lift", "non lifted", "non-lifted", "lifted member", "post lift"],
  },
  {
    key: "hasCommission",
    label: "Commission Clause",
    description: "Organizer or foreman commission",
    keywords: ["commission", "foreman", "organizer fee", "management fee"],
  },
  {
    key: "hasDividend",
    label: "Dividend / Surplus Sharing",
    description: "Profit or surplus distributed to members",
    keywords: ["dividend", "profit", "bonus", "surplus"],
  },
  {
    key: "hasPenalty",
    label: "Penalty / Late Fee Clause",
    description: "Late payment or default charges",
    keywords: ["penalty", "late fee", "fine", "default charge"],
  },
  {
    key: "hasDeposit",
    label: "Deposit / Security Clause",
    description: "Security deposit or advance required",
    keywords: ["deposit", "security", "advance", "caution"],
  },
  {
    key: "hasBidding",
    label: "Bidding / Auction Mechanism",
    description: "Members bid to determine prize amount",
    keywords: ["bid", "bidding", "bidding amount", "bid amount"],
  },
];

/**
 * Guard: ensure a value is always an Array.
 * If the value is missing, null, undefined, or not an array, return [].
 */
function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Guard: ensure a value is always a plain Object.
 * If the value is missing, null, undefined, or not a plain object, return {}.
 */
function ensureObject(value) {
  return (value && typeof value === "object" && !Array.isArray(value)) ? value : {};
}

export const UniversalBusinessRuleEngine = {
  /**
   * Generate the universal normalized JSON from uploaded document data.
   *
   * @param {Object} params
   * @param {File} [params.file] - Original uploaded file
   * @param {string} params.rawText - Raw text extracted from document
   * @param {Array} [params.rows=[]] - Parsed schedule rows (always coerced to Array)
   * @param {Array} [params.members=[]] - Parsed member entries (always coerced to Array)
   * @param {string} params.provider - Extraction provider (manual, external-ocr, etc.)
   * @returns {Object} Normalized JSON with:
   *   Business{}, Members[], Month Schedule[], Detected Rules[], Unknown Rules[],
   *   Confidence{}, Evidence{business:{}, rules:{}, scheduleRows:[], members:[]}
   */
  generateNormalizedJSON({
    file,
    rawText = "",
    rows = [],
    members = [],
    provider = "manual",
    structuredExtraction = null,
    providerMetadata = {},
  } = {}) {
    // SAFETY: Coerce all array inputs — never trust caller
    const safeRows = ensureArray(rows);
    const safeMembers = ensureArray(members);

    const normalizedRows = safeRows.map((row, i) => this.normalizeScheduleRow(row, i));
    const normalizedMembers = safeMembers.map((m, i) => this.normalizeMember(m, i));
    const business = this.extractBusiness(rawText, normalizedRows, structuredExtraction);
    const { detectedRules, unknownRules } = this.detectRules(rawText, normalizedRows);
    const confidence = this.buildConfidence(
      business,
      detectedRules,
      normalizedRows,
      normalizedMembers,
      providerMetadata
    );
    const evidence = this.buildEvidence(
      business,
      detectedRules,
      normalizedRows,
      normalizedMembers,
      providerMetadata
    );

    return {
      id: `ubre-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      sourceDocument: {
        provider: providerMetadata.provider || provider,
        rawTextLength: Number(providerMetadata.rawTextLength ?? rawText.length),
        documentId: providerMetadata.documentId || null,
        documentType: providerMetadata.documentType || this.classifyDocumentType({ fileName: file?.name, rawText }),
        languageDetected: providerMetadata.languageDetected || "UNKNOWN",
        confidenceScore: Number(providerMetadata.confidenceScore ?? confidence.overall),
        originalFileName: file?.name || "Manual entry",
        mimeType: file?.type || "text/manual",
        fileSize: file?.size || 0,
        fieldScores: ensureObject(providerMetadata.fieldScores),
        requiresHumanReview: Boolean(providerMetadata.requiresHumanReview),
        warnings: ensureArray(providerMetadata.warnings),
        // Backward-compatible aliases used by legacy reconstruction.
        name: file?.name || "Manual entry",
        type: file?.type || "text/manual",
        size: file?.size || 0,
      },
      Business: business,
      Members: normalizedMembers,
      "Month Schedule": normalizedRows,
      "Detected Rules": detectedRules,
      "Unknown Rules": unknownRules,
      Confidence: confidence,
      Evidence: evidence,
      // Workspace state (editable by owner)
      workspace: {
        status: "NEEDS_REVIEW",
        ownerConfirmed: false,
        ownerChanges: [],
        auditLog: [this.auditEntry("GENERATED", { provider, source: file?.name })],
      },
    };
  },

  /**
   * Extract business-level fields from document text and schedule rows.
   * NEVER defaults missing numeric values to 0. NEVER assumes financial values.
   */
  extractBusiness(rawText, rows, structuredExtraction = null) {
    const source = structuredExtraction && typeof structuredExtraction === "object"
      ? this.mapStructuredExtraction(structuredExtraction)
      : this.parseSourceObject(rawText);
    const result = {};

    BUSINESS_FIELDS.forEach((field) => {
      let raw = this.findFieldValue(field, source, rows);
      if (
        field.key === "installmentPattern"
        && (!raw || raw === "UNKNOWN")
      ) {
        const explicitPattern = parseInstallmentPattern(rawText);
        raw = explicitPattern !== "UNKNOWN" ? explicitPattern : this.deriveInstallmentPattern(rows);
      }
      const hasValue = raw !== null && raw !== undefined && raw !== "";
      const normalized = hasValue ? this.normalizeFieldValue(field.type, raw) : null;
      result[field.key] = {
        value: normalized,
        state: normalized !== null && normalized !== "UNKNOWN" ? VALUE_STATE.FOUND : VALUE_STATE.NOT_FOUND,
      };
    });

    return result;
  },

  /**
   * Detect rules from document evidence only.
   * Commission, bidding, penalty are ONLY detected when explicitly mentioned.
   * No financial value is ever calculated or assumed.
   */
  detectRules(rawText, rows) {
    const text = rawText.toLowerCase();
    const detectedRules = [];
    const unknownRules = [];

    DETECTABLE_RULES.forEach((rule) => {
      const keywordMatch = rule.keywords.some((kw) => text.includes(kw));
      const scheduleEvidence = this.findScheduleRuleEvidence(rule.key, rows);
      const found = Boolean(keywordMatch || scheduleEvidence);

      if (found) {
        let state = RULE_STATE.DETECTED;
        let confidence = 0.6;
        const evidencePieces = [];

        if (keywordMatch) {
          evidencePieces.push(`Keywords found in document text: ${rule.keywords.filter((kw) => text.includes(kw)).join(", ")}`);
        }
        if (scheduleEvidence) {
          confidence = Math.max(confidence, 0.8);
          evidencePieces.push(scheduleEvidence);
        }
        // If both keyword and schedule, strong detection
        if (keywordMatch && scheduleEvidence) {
          confidence = 0.9;
          state = RULE_STATE.DETECTED;
        }
        // Keyword only with weak match
        if (keywordMatch && !scheduleEvidence) {
          state = RULE_STATE.AMBIGUOUS;
          confidence = 0.4;
        }

        detectedRules.push({
          key: rule.key,
          label: rule.label,
          description: rule.description,
          state,
          confidence: Math.round(confidence * 100) / 100,
          evidence: evidencePieces.length > 0 ? evidencePieces : ["Detected in document"],
          ownerConfirmed: false,
        });
      } else {
        unknownRules.push({
          key: rule.key,
          label: rule.label,
          description: rule.description,
          state: RULE_STATE.NOT_DETECTED,
          confidence: 0,
          evidence: ["Not detected in document — enter if applicable"],
          ownerConfirmed: false,
        });
      }
    });

    return { detectedRules, unknownRules };
  },

  /**
   * Build confidence scores for every field and rule.
   * Confidence is 0 for NOT_FOUND, >0 for FOUND, 1 for OWNER_DEFINED.
   */
  buildConfidence(business, detectedRules, rows, members, providerMetadata = {}) {
    const businessConfidence = {};
    Object.entries(business).forEach(([key, field]) => {
      const providerFieldKey = key === "duration" ? "durationMonths" : key;
      businessConfidence[key] = field.state === VALUE_STATE.FOUND
        ? Number(providerMetadata.fieldScores?.[key] ?? providerMetadata.fieldScores?.[providerFieldKey] ?? 0.85)
        : 0;
    });

    const ruleConfidence = {};
    ensureArray(detectedRules).forEach((rule) => {
      ruleConfidence[rule.key] = rule.confidence;
    });

    return {
      overall: Number.isFinite(Number(providerMetadata.confidenceScore))
        ? Number(providerMetadata.confidenceScore)
        : this.calculateOverallConfidence(business, ensureArray(detectedRules), ensureArray(rows)),
      business: businessConfidence,
      rules: ruleConfidence,
      scheduleRows: ensureArray(rows).length > 0
        ? Math.round(ensureArray(rows).filter((r) => r.confidence > 0).length / ensureArray(rows).length * 100) / 100
        : 0,
      members: ensureArray(members).length > 0
        ? Math.round(ensureArray(members).filter((m) => m.confidence > 0).length / ensureArray(members).length * 100) / 100
        : 0,
    };
  },

  /**
   * Build evidence strings for every extracted value.
   * Evidence is the source trace — never empty for FOUND values.
   * Always returns structure: { business:{}, rules:{}, scheduleRows:[], members:[] }
   */
  buildEvidence(business, detectedRules, rows, members, providerMetadata = {}) {
    const businessEvidence = {};
    Object.entries(ensureObject(business)).forEach(([key, field]) => {
      const providerKey = key === "duration"
        ? "durationMonths"
        : key === "grossInstallment"
          ? "monthlyInstallment"
          : key;
      businessEvidence[key] = providerMetadata.fieldResults?.[providerKey]?.sourceText
        || (field.state === VALUE_STATE.FOUND
          ? `Extracted from document: ${field.value}`
          : "Not found in document");
    });

    const ruleEvidence = {};
    ensureArray(detectedRules).forEach((rule) => {
      ruleEvidence[rule.key] = rule.evidence;
    });

    return {
      business: businessEvidence,
      rules: ruleEvidence,
      scheduleRows: ensureArray(rows).map((r) => r.evidence || "Extracted from document"),
      members: ensureArray(members).map((m) => m.evidence || "Extracted from document"),
    };
  },

  /**
   * Apply owner corrections to the normalized JSON.
   */
  applyOwnerCorrections(normalizedJSON, corrections = {}) {
    const updated = JSON.parse(JSON.stringify(normalizedJSON));

    // Apply business field corrections
    Object.entries(corrections.business || {}).forEach(([key, value]) => {
      if (updated.Business[key]) {
        const hasValue = value !== null && value !== undefined && value !== "";
        updated.Business[key] = {
          value: hasValue ? value : null,
          state: hasValue ? VALUE_STATE.OWNER_DEFINED : VALUE_STATE.NOT_FOUND,
        };
      }
    });

    // Apply rule confirmations
    ensureArray(corrections.rules).forEach(({ key, confirmed }) => {
      const rule = ensureArray(updated["Detected Rules"]).find((r) => r.key === key);
      if (rule) {
        rule.state = confirmed ? RULE_STATE.OWNER_CONFIRMED : rule.state;
        rule.ownerConfirmed = confirmed;
        rule.confidence = confirmed ? 1 : rule.confidence;
      }
      // Also update Unknown Rules
      const unknownRule = ensureArray(updated["Unknown Rules"]).find((r) => r.key === key);
      if (unknownRule && confirmed) {
        unknownRule.state = RULE_STATE.OWNER_CONFIRMED;
        unknownRule.ownerConfirmed = confirmed;
        unknownRule.confidence = 1;
        unknownRule.evidence = ["Owner confirmed"];
      }
    });

    // Apply schedule corrections
    if (corrections.schedule) {
      updated["Month Schedule"] = ensureArray(corrections.schedule).map((row, i) => {
        const existing = ensureArray(updated["Month Schedule"])[i] || {};
        return { ...existing, ...row, isOwnerEdited: true };
      });
    }

    // Apply member corrections
    if (corrections.members) {
      updated.Members = ensureArray(corrections.members).map((m, i) => {
        const existing = ensureArray(updated.Members)[i] || {};
        return { ...existing, ...m, isOwnerEdited: true };
      });
    }

    // Log owner change
    updated.workspace.ownerChanges.push({
      at: new Date().toISOString(),
      corrections: Object.keys(corrections),
    });
    updated.workspace.auditLog.push(this.auditEntry("OWNER_CORRECTION", {
      fields: Object.keys(corrections.business || {}),
      rules: ensureArray(corrections.rules).map((r) => r.key),
    }));

    // Rebuild confidence and evidence after corrections
    updated.Confidence = this.buildConfidence(updated.Business, updated["Detected Rules"], updated["Month Schedule"], updated.Members);
    updated.Evidence = this.buildEvidence(updated.Business, updated["Detected Rules"], updated["Month Schedule"], updated.Members);

    return updated;
  },

  /**
   * Confirm the workspace as owner-approved, enabling chit creation.
   */
  confirmWorkspace(normalizedJSON) {
    const workspace = ensureObject(normalizedJSON.workspace);
    return {
      ...normalizedJSON,
      workspace: {
        ...workspace,
        status: "OWNER_APPROVED",
        ownerConfirmed: true,
        confirmedAt: new Date().toISOString(),
        auditLog: [
          ...ensureArray(workspace.auditLog),
          this.auditEntry("OWNER_APPROVED", {}),
        ],
      },
    };
  },

  /**
   * Verify that no prohibited values were assumed.
   * Returns validation errors if financial values were fabricated.
   */
  validateNoAssumptions(normalizedJSON) {
    const errors = [];
    const business = normalizedJSON.Business || {};
    const schedule = ensureArray(normalizedJSON["Month Schedule"]);

    // Check that no financial values were calculated
    if (business.chitValue?.state === VALUE_STATE.FOUND) {
      const cv = Number(business.chitValue?.value);
      if (isNaN(cv) || cv <= 0) {
        errors.push("Chit value is invalid or was not provided in the document.");
      }
    }

    // Verify schedule has no fabricated financial values
    schedule.forEach((row, i) => {
      // Any value that is present but has 0 confidence was likely assumed
      const financialFields = [
        "standardPayment", "nonLiftedPayment", "liftedPayment",
        "prizeAmount", "bidAmount", "commissionValue",
        "dividendPerMember", "deposit", "penalty", "otherDeductions", "netAmount",
      ];
      financialFields.forEach((field) => {
        if (row[field] !== null && row[field] !== undefined && row[field] !== "" && !row.isOwnerEdited) {
          const val = Number(row[field]);
          if (val > 0 && row.confidence === 0) {
            errors.push(`Schedule row ${i + 1}: ${field} has value ${val} but 0 confidence — may be an assumption.`);
          }
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /** Classify document type from file name and text */
  classifyDocumentType({ fileName = "", rawText = "" } = {}) {
    const text = `${fileName} ${rawText}`.toLowerCase();
    // SAFETY: DOCUMENT_TYPE_PATTERNS is an array of { pattern, label } objects.
    // Use object destructuring, NOT array destructuring — objects are NOT iterable!
    const match = DOCUMENT_TYPE_PATTERNS.find(({ pattern }) => text.includes(pattern));
    return match ? match.label : "Custom/Unknown Chit Document";
  },

  /** Normalize a schedule row — never defaults missing values to 0 */
  normalizeScheduleRow(row, index = 0) {
    // SAFETY: row could be a non-object (number, string, null, array, etc.).
    // Guard against spread on non-iterable by ensuring it's a plain object.
    const safeRow = (row && typeof row === "object" && !Array.isArray(row)) ? row : {};

    const toNullSafeNumber = (v) => {
      if (v === null || v === undefined || v === "") return null;
      const n = Number(v);
      return isNaN(n) ? null : n;
    };

    return {
      monthNumber: toNullSafeNumber(safeRow.monthNumber || safeRow.month) || index + 1,
      monthLabel: safeRow.monthLabel || `Month ${index + 1}`,
      standardPayment: toNullSafeNumber(safeRow.standardPayment || safeRow.payment || safeRow.monthlyPayment),
      nonLiftedPayment: toNullSafeNumber(safeRow.nonLiftedPayment || safeRow.non_lifted_payment),
      liftedPayment: toNullSafeNumber(safeRow.liftedPayment || safeRow.lifted_payment),
      prizeAmount: toNullSafeNumber(safeRow.prizeAmount || safeRow.prize),
      bidAmount: toNullSafeNumber(safeRow.bidAmount || safeRow.bid),
      dividendPerMember: toNullSafeNumber(safeRow.dividendPerMember || safeRow.dividend),
      commissionValue: toNullSafeNumber(safeRow.commissionValue || safeRow.commission),
      deposit: toNullSafeNumber(safeRow.deposit || safeRow.security_deposit),
      penalty: toNullSafeNumber(safeRow.penalty || safeRow.late_fee),
      otherDeductions: toNullSafeNumber(safeRow.otherDeductions || safeRow.other_deductions),
      netAmount: toNullSafeNumber(safeRow.netAmount || safeRow.net_amount),
      status: safeRow.status || "NEEDS_REVIEW",
      confidence: Math.min(Number(safeRow.confidence) || 0, 1),
      evidence: safeRow.evidence || `Schedule row ${index + 1}`,
      isOwnerEdited: Boolean(safeRow.isOwnerEdited),
    };
  },

  /** Normalize a member entry — never assumes missing data */
  normalizeMember(member, index = 0) {
    // SAFETY: member could be a non-object
    const safeMember = (member && typeof member === "object" && !Array.isArray(member)) ? member : {};

    return {
      memberNumber: safeMember.memberNumber || safeMember.member_number || safeMember.serialNumber || safeMember.serial_number || index + 1,
      name: safeMember.name || safeMember.memberName || safeMember.member_name || null,
      contact: safeMember.contact || safeMember.mobile || safeMember.mobile_number || safeMember.phone || null,
      address: safeMember.address || null,
      status: safeMember.status || "PENDING",
      confidence: Math.min(Number(safeMember.confidence) || 0, 1),
      evidence: safeMember.evidence || `Member entry ${index + 1}`,
      isOwnerEdited: Boolean(safeMember.isOwnerEdited),
    };
  },

  /** Calculate overall confidence across all sections */
  calculateOverallConfidence(business, detectedRules, rows) {
    const safeBusiness = ensureObject(business);
    const safeRules = ensureArray(detectedRules);
    const safeRows = ensureArray(rows);

    const businessKeys = Object.keys(safeBusiness);
    const businessScores = businessKeys.length > 0
      ? Object.values(safeBusiness).filter((f) => f.state === VALUE_STATE.FOUND).length / businessKeys.length
      : 0;

    const ruleScores = safeRules.length > 0
      ? safeRules.reduce((sum, r) => sum + r.confidence, 0) / safeRules.length
      : 0;

    const scheduleScore = safeRows.length > 0
      ? safeRows.reduce((sum, r) => sum + (r.confidence || 0), 0) / safeRows.length
      : 0;

    return Math.round((businessScores * 0.4 + ruleScores * 0.35 + scheduleScore * 0.25) * 100) / 100;
  },

  /** Find schedule-based evidence for rules */
  findScheduleRuleEvidence(ruleKey, rows) {
    const safeRows = ensureArray(rows);
    if (safeRows.length === 0) return null;

    switch (ruleKey) {
      case "winnerSelection":
        if (safeRows.some((r) => r.bidAmount !== null)) {
          return `Bid amounts found in ${safeRows.filter((r) => r.bidAmount !== null).length} schedule rows`;
        }
        break;
      case "prizePayout":
        if (safeRows.some((r) => r.prizeAmount !== null)) {
          return `Prize amounts found in ${safeRows.filter((r) => r.prizeAmount !== null).length} schedule rows`;
        }
        break;
      case "liftMechanism":
        if (safeRows.some((r) => r.nonLiftedPayment !== null || r.liftedPayment !== null)) {
          return "Separate non-lift/lift payment columns found in schedule";
        }
        break;
      case "hasCommission":
        if (safeRows.some((r) => r.commissionValue !== null)) {
          return "Commission values found in schedule rows";
        }
        break;
      case "hasDividend":
        if (safeRows.some((r) => r.dividendPerMember !== null)) {
          return "Dividend values found in schedule rows";
        }
        break;
      case "hasDeposit":
        if (safeRows.some((r) => r.deposit !== null)) {
          return "Deposit values found in schedule rows";
        }
        break;
      case "hasPenalty":
        if (safeRows.some((r) => r.penalty !== null)) {
          return "Penalty values found in schedule rows";
        }
        break;
      case "hasBidding":
        if (safeRows.some((r) => r.bidAmount !== null)) {
          return `Bid amounts found in ${safeRows.filter((r) => r.bidAmount !== null).length} schedule rows`;
        }
        break;
      case "paymentPattern": {
        const payments = safeRows.map((r) => r.standardPayment).filter((v) => v !== null);
        if (payments.length > 0) {
          const uniquePayments = new Set(payments);
          if (uniquePayments.size === 1) return "All months show the same payment amount";
          if (uniquePayments.size > 1) return "Month-wise payment values differ";
        }
        break;
      }
    }
    return null;
  },

  /** Parse raw text as JSON if possible */
  parseSourceObject(rawText) {
    try {
      const parsed = JSON.parse(rawText || "{}");
      return Array.isArray(parsed) ? {} : parsed;
    } catch {
      return parseChitNaturalText(rawText);
    }
  },

  mapStructuredExtraction(extraction) {
    return {
      ...ensureObject(extraction),
      duration: extraction.durationMonths ?? extraction.duration,
      monthlyPayment: extraction.monthlyInstallment ?? extraction.monthlyPayment,
      grossInstallment: extraction.monthlyInstallment ?? extraction.grossInstallment,
    };
  },

  deriveInstallmentPattern(rows) {
    const safeRows = ensureArray(rows);
    if (safeRows.some((row) => row.nonLiftedPayment !== null || row.liftedPayment !== null)) {
      return "LIFTED_NON_LIFTED";
    }
    const payments = safeRows
      .map((row) => row.standardPayment)
      .filter((value) => value !== null && value !== undefined);
    if (!payments.length) return "UNKNOWN";
    return new Set(payments.map(Number)).size === 1 ? "FIXED_MONTHLY" : "VARIABLE_MONTHLY";
  },

  /** Find a field value by trying all aliases */
  findFieldValue(fieldDef, source, rows) {
    const safeSource = ensureObject(source);
    const safeRows = ensureArray(rows);

    const normalizedSource = Object.fromEntries(
      Object.entries(safeSource).map(([key, val]) => [
        key.toLowerCase().replace(/[^a-z0-9]/g, ""),
        val,
      ])
    );

    // Try aliases in source object
    const aliasValue = fieldDef.aliases
      .map((alias) => normalizedSource[alias.toLowerCase().replace(/[^a-z0-9]/g, "")])
      .find((v) => v !== undefined && v !== null && v !== "");
    if (aliasValue !== undefined) return aliasValue;

    // Try first row for schedule-derived fields
    const first = safeRows[0] || {};
    if (fieldDef.key === "duration" && first.monthNumber) return safeRows.length;
    if (
      fieldDef.key === "startDate"
      && typeof first.monthLabel === "string"
      && /^\d{4}-\d{2}-\d{2}$/.test(first.monthLabel)
    ) return first.monthLabel;

    return null;
  },

  /** Normalize a field value by its expected type */
  normalizeFieldValue(type, value) {
    if (value === null || value === undefined || value === "") return null;
    if (type === "number") {
      const num = Number(String(value).replace(/[^\d.-]/g, ""));
      return isNaN(num) ? null : num;
    }
    if (type === "pattern") {
      const normalized = String(value).trim().toUpperCase().replace(/[\s/-]+/g, "_");
      return ["FIXED_MONTHLY", "VARIABLE_MONTHLY", "LIFTED_NON_LIFTED", "CUSTOM_RULE"]
        .includes(normalized) ? normalized : "UNKNOWN";
    }
    return String(value).trim();
  },

  /** Create an audit log entry */
  auditEntry(action, details) {
    return {
      action,
      details,
      at: new Date().toISOString(),
    };
  },
};

export default UniversalBusinessRuleEngine;
