/**
 * Universal Business Understanding Engine
 *
 * Every uploaded document passes through this engine.
 * It extracts only objective facts, classifies business rules,
 * and generates one editable Business Workspace.
 *
 * Three states for every value:
 *   FOUND        — extracted from document
 *   NOT_FOUND    — not mentioned in document (blank, 0% confidence)
 *   OWNER_DEFINED — owner entered after review
 *
 * Never defaults missing numeric values to 0.
 * Never fabricates financial values.
 * Unknown values remain blank until owner confirmation.
 */

export const FIELD_STATUS = Object.freeze({
  FOUND: "FOUND",
  NOT_FOUND: "NOT_FOUND",
  OWNER_DEFINED: "OWNER_DEFINED",
});

export const RULE_STATUS = Object.freeze({
  FOUND: "FOUND",
  NOT_FOUND: "NOT_FOUND",
  AMBIGUOUS: "AMBIGUOUS",
  OWNER_CONFIRMED: "OWNER_CONFIRMED",
});

export const DOCUMENT_TYPES = [
  "Chit Poster", "Chit Plan", "Month-wise Schedule", "Auction Plan",
  "Promotional Plan", "Daily Collection Plan", "Multi-plan Comparison",
  "Rules Sheet", "Terms and Conditions", "Member Sheet", "Receipt",
  "Ledger", "Voice Note Transcript", "Text Description",
  "Custom/Unknown Chit Document",
];

const FIELD_ALIASES = {
  chitName: ["chitname", "chit_name", "name", "scheme name", "scheme_name"],
  chitValue: ["chitvalue", "chit_value", "value", "total value", "total_value", "chit amount", "chit_amount"],
  memberCount: ["membercount", "members", "total_members", "no of members", "number_of_members"],
  duration: ["duration", "months", "total_months", "period", "tenure"],
  monthlyPayment: ["monthlypayment", "monthly_amount", "installment", "payment", "monthly contribution", "monthly_contribution"],
  commission: ["commission", "commission_rate", "commission rate", "foreman commission", "foreman_commission"],
  deposit: ["deposit", "security deposit", "security_deposit", "advance"],
  penalty: ["penalty", "late fee", "late_fee", "fine"],
  dividend: ["dividend", "dividend_per_member", "profit share", "profit_share"],
  startDate: ["start_date", "startdate", "commencement", "commencement_date"],
  endDate: ["end_date", "enddate", "closing date", "closing_date"],
};

const BUSINESS_RULE_DETECTORS = [
  { key: "hasBidding", label: "Bidding / Auction present", keywords: ["bid", "auction", "premium", "prize money", "bid amount"] },
  { key: "hasPredefinedPayout", label: "Predefined payout schedule", keywords: ["fixed payout", "payout schedule", "prize schedule", "payout amount"] },
  { key: "hasFixedPayment", label: "Fixed monthly payment", keywords: ["fixed", "same every month", "equal installment", "fixed monthly"] },
  { key: "hasMonthWisePayment", label: "Month-wise variable payment", keywords: ["month wise", "month-wise", "variable", "different each month", "schedule attached"] },
  { key: "hasLiftMechanism", label: "Lift / After-lift payment change", keywords: ["lift", "after lift", "non lifted", "non-lifted", "lifted member", "post lift"] },
  { key: "hasCommission", label: "Foreman commission", keywords: ["commission", "foreman", "organizer fee", "management fee"] },
  { key: "hasDividend", label: "Dividend / Profit sharing", keywords: ["dividend", "profit", "bonus", "surplus"] },
  { key: "hasPenalty", label: "Penalty / Late fee", keywords: ["penalty", "late fee", "fine", "default charge"] },
  { key: "hasDeposit", label: "Deposit / Security", keywords: ["deposit", "security", "advance", "caution"] },
  { key: "hasPrizeAmount", label: "Prize amount specified", keywords: ["prize", "prize money", "award", "winning"] },
];

export const ChitDocumentUnderstandingEngine = {
  validateFile(file) {
    if (!file) return { valid: false, errors: ["Choose a document to continue."] };
    const extension = file.name.split(".").pop()?.toLowerCase();
    const supported = ["jpg", "jpeg", "png", "webp", "pdf", "csv", "json", "xlsx", "xls", "txt", "mp3", "wav", "ogg"];
    const errors = [];
    if (!supported.includes(extension)) errors.push("Unsupported file type. Use image, PDF, CSV, Excel, JSON, text, or audio.");
    if (Number(file.size || 0) > 15 * 1024 * 1024) errors.push("File exceeds the 15 MB safety limit.");
    return {
      valid: errors.length === 0,
      errors,
      extension,
      requiresExternalProvider: ["jpg", "jpeg", "png", "webp", "pdf", "mp3", "wav", "ogg"].includes(extension),
      requiresSpreadsheetProvider: ["xlsx", "xls"].includes(extension),
    };
  },

  classify({ fileName = "", rawText = "" } = {}) {
    const text = `${fileName} ${rawText}`.toLowerCase();
    const rules = [
      ["receipt", "Receipt"],
      ["ledger", "Ledger"],
      ["member", "Member Sheet"],
      ["terms", "Terms and Conditions"],
      ["rule", "Rules Sheet"],
      ["comparison", "Multi-plan Comparison"],
      ["daily", "Daily Collection Plan"],
      ["auction", "Auction Plan"],
      ["poster", "Chit Poster"],
      ["schedule", "Month-wise Schedule"],
      ["plan", "Chit Plan"],
      ["promo", "Promotional Plan"],
      ["voice", "Voice Note Transcript"],
      ["transcript", "Voice Note Transcript"],
    ];
    return rules.find(([word]) => text.includes(word))?.[1] || "Custom/Unknown Chit Document";
  },

  /**
   * Build a complete Business Understanding analysis from raw document data.
   * Never invents values. Every field has confidence and source evidence.
   * Missing values are null, not 0.
   */
  buildAnalysis({ file, rawText = "", rows = [], provider = "manual" } = {}) {
    const normalizedRows = rows.map(normalizeScheduleRow);
    const fields = extractFields(rawText, normalizedRows);
    const classification = this.classify({ fileName: file?.name, rawText });
    const businessRules = this.detectBusinessRules(rawText, normalizedRows, fields);
    const relationships = this.detectRelationships(normalizedRows);
    const missing = Object.entries(fields)
      .filter(([, field]) => field.status === FIELD_STATUS.NOT_FOUND)
      .map(([key]) => key);

    return {
      id: `analysis-${Date.now()}`,
      status: "Needs Review",
      originalDocument: {
        name: file?.name || "Manual entry",
        type: file?.type || "text/manual",
        size: file?.size || 0,
        lastModified: file?.lastModified || null,
      },
      rawExtractedContent: rawText,
      documentType: classification,
      businessSummary: this.buildBusinessSummary(fields, normalizedRows, businessRules),
      detectedPattern: this.detectPattern(businessRules, relationships),
      fields,
      schedule: normalizedRows,
      businessRules,
      relationships,
      missingInformation: missing,
      clarificationQuestions: missing.map((key) => `Please confirm ${humanize(key)}.`),
      userCorrections: [],
      confirmedConfiguration: null,
      rules: [],
      terms: [],
      auditHistory: [audit("ANALYSIS_CREATED", { provider, classification })],
      provider,
    };
  },

  /**
   * Detect business rules from document text and schedule data.
   * Every rule has: value, confidence, source evidence, status.
   */
  detectBusinessRules(rawText, rows, fields) {
    const text = rawText.toLowerCase();
    const rules = BUSINESS_RULE_DETECTORS.map((detector) => {
      const found = detector.keywords.some((kw) => text.includes(kw));
      const scheduleEvidence = this.scheduleRuleEvidence(detector.key, rows);
      const fieldEvidence = fields[detector.key.replace("has", "").toLowerCase()]?.normalizedValue;

      let status = RULE_STATUS.NOT_FOUND;
      let confidence = 0;
      let evidence = [];

      if (found) {
        status = RULE_STATUS.FOUND;
        confidence = 0.6;
        evidence.push(`Keyword match in document text`);
      }
      if (scheduleEvidence) {
        status = RULE_STATUS.FOUND;
        confidence = Math.max(confidence, 0.8);
        evidence.push(scheduleEvidence);
      }
      if (fieldEvidence !== null && fieldEvidence !== undefined && fieldEvidence !== "") {
        status = RULE_STATUS.FOUND;
        confidence = Math.max(confidence, 0.85);
        evidence.push(`Field value present: ${fieldEvidence}`);
      }
      if (found && !scheduleEvidence && !fieldEvidence) {
        status = RULE_STATUS.AMBIGUOUS;
        confidence = 0.4;
      }

      return {
        key: detector.key,
        label: detector.label,
        value: found || Boolean(scheduleEvidence) || (fieldEvidence !== null && fieldEvidence !== undefined && fieldEvidence !== ""),
        confidence: Math.round(confidence * 100) / 100,
        status,
        evidence: evidence.length > 0 ? evidence.join("; ") : "Not detected in document",
        ownerConfirmed: false,
      };
    });

    return rules;
  },

  scheduleRuleEvidence(ruleKey, rows) {
    if (!rows || rows.length === 0) return null;
    if (ruleKey === "hasBidding" && rows.some((r) => r.bidAmount !== null && Number(r.bidAmount) > 0)) {
      return `Bid amounts found in ${rows.filter((r) => r.bidAmount !== null && Number(r.bidAmount) > 0).length} schedule rows`;
    }
    if (ruleKey === "hasPredefinedPayout" && rows.some((r) => r.prizeAmount !== null && Number(r.prizeAmount) > 0)) {
      return `Prize amounts found in ${rows.filter((r) => r.prizeAmount !== null && Number(r.prizeAmount) > 0).length} schedule rows`;
    }
    if (ruleKey === "hasMonthWisePayment") {
      const payments = rows.map((r) => r.standardPayment).filter((v) => v !== null);
      if (payments.length > 1 && new Set(payments).size > 1) {
        return "Month-wise payment values differ";
      }
    }
    if (ruleKey === "hasLiftMechanism") {
      if (rows.some((r) => (r.nonLiftedPayment !== null && Number(r.nonLiftedPayment) > 0) || (r.liftedPayment !== null && Number(r.liftedPayment) > 0))) {
        return "Lift/non-lift payment columns present in schedule";
      }
    }
    if (ruleKey === "hasCommission" && rows.some((r) => r.commissionValue !== null && Number(r.commissionValue) > 0)) {
      return "Commission values found in schedule";
    }
    if (ruleKey === "hasDividend" && rows.some((r) => r.dividendPerMember !== null && Number(r.dividendPerMember) > 0)) {
      return "Dividend values found in schedule";
    }
    if (ruleKey === "hasPrizeAmount" && rows.some((r) => r.prizeAmount !== null && Number(r.prizeAmount) > 0)) {
      return "Prize amounts found in schedule";
    }
    return null;
  },

  detectPattern(businessRules, relationships) {
    const hasBidding = businessRules.find((r) => r.key === "hasBidding")?.value;
    const hasFixed = businessRules.find((r) => r.key === "hasFixedPayment")?.value;
    const hasVariable = businessRules.find((r) => r.key === "hasMonthWisePayment")?.value;
    const hasLift = businessRules.find((r) => r.key === "hasLiftMechanism")?.value;
    const hasPayout = businessRules.find((r) => r.key === "hasPredefinedPayout")?.value;

    if (hasBidding && hasPayout) return { type: "Auction Chit", confidence: 0.8 };
    if (hasFixed && !hasVariable && !hasLift) return { type: "Fixed Chit", confidence: 0.9 };
    if (hasVariable && !hasLift) return { type: "Variable Monthly Chit", confidence: 0.8 };
    if (hasLift && hasVariable) return { type: "Lift-based Variable Chit", confidence: 0.85 };
    if (hasLift && hasFixed) return { type: "Lift-based Fixed Chit", confidence: 0.85 };
    if (hasBidding) return { type: "Auction Chit", confidence: 0.6 };
    if (hasPayout) return { type: "Prize-based Chit", confidence: 0.6 };

    const relationshipCount = relationships.length;
    if (relationshipCount >= 3) return { type: "Configured Chit", confidence: 0.7 };
    if (relationshipCount >= 1) return { type: "Partially Configured Chit", confidence: 0.5 };

    return { type: "Unconfirmed Pattern", confidence: 0.2 };
  },

  buildBusinessSummary(fields, rows, businessRules) {
    const f = Object.fromEntries(
      Object.entries(fields).map(([key, item]) => [key, item.normalizedValue])
    );
    const activeRules = businessRules.filter((r) => r.status === RULE_STATUS.FOUND);
    return {
      chitName: f.chitName || null,
      chitValue: f.chitValue,
      memberCount: f.memberCount,
      duration: f.duration,
      monthlyPayment: f.monthlyPayment,
      commission: f.commission,
      deposit: f.deposit,
      penalty: f.penalty,
      dividend: f.dividend,
      startDate: f.startDate || null,
      endDate: f.endDate || null,
      scheduleRows: rows.length,
      detectedRuleCount: activeRules.length,
    };
  },

  detectRelationships(rows = []) {
    if (rows.length < 2) return [];
    return [
      "standardPayment",
      "nonLiftedPayment",
      "liftedPayment",
      "prizeAmount",
      "bidAmount",
      "dividendPerMember",
      "commissionValue",
    ]
      .map((field) => verifyConstant(rows, field))
      .filter(Boolean);
  },

  applyCorrections(analysis, corrections = {}) {
    const fields = { ...analysis.fields };
    Object.entries(corrections.fields || {}).forEach(([key, value]) => {
      const hasValue = value !== null && value !== undefined && value !== "";
      fields[key] = {
        ...(fields[key] || fieldRecord(null, 0, FIELD_STATUS.NOT_FOUND)),
        userCorrectedValue: hasValue ? value : null,
        normalizedValue: hasValue ? normalizeValue(key, value) : null,
        status: hasValue ? FIELD_STATUS.OWNER_DEFINED : FIELD_STATUS.NOT_FOUND,
        confidence: hasValue ? 1 : 0,
      };
    });

    const schedule = (corrections.schedule || analysis.schedule).map(normalizeScheduleRow);
    const businessRules = corrections.businessRules || analysis.businessRules;
    const rules = corrections.rules || analysis.rules || [];
    const terms = corrections.terms || analysis.terms || [];
    const relationships = this.detectRelationships(schedule);

    return {
      ...analysis,
      fields,
      schedule,
      businessRules,
      rules,
      terms,
      relationships,
      businessSummary: this.buildBusinessSummary(fields, schedule, businessRules),
      detectedPattern: this.detectPattern(businessRules, relationships),
      missingInformation: Object.entries(fields)
        .filter(([, field]) => field.status === FIELD_STATUS.NOT_FOUND)
        .map(([key]) => key),
      userCorrections: [
        ...analysis.userCorrections,
        { at: new Date().toISOString(), corrections },
      ],
      auditHistory: [
        ...analysis.auditHistory,
        audit("USER_CORRECTION", { fields: Object.keys(corrections.fields || {}) }),
      ],
    };
  },

  confirmBusinessRule(analysis, ruleKey, confirmed) {
    const businessRules = analysis.businessRules.map((rule) => {
      if (rule.key === ruleKey) {
        return {
          ...rule,
          status: confirmed ? RULE_STATUS.OWNER_CONFIRMED : rule.status,
          ownerConfirmed: confirmed,
          confidence: confirmed ? 1 : rule.confidence,
        };
      }
      return rule;
    });
    return {
      ...analysis,
      businessRules,
      auditHistory: [
        ...analysis.auditHistory,
        audit("RULE_CONFIRMED", { ruleKey, confirmed }),
      ],
    };
  },
};

function extractFields(rawText, rows) {
  let source = {};
  try {
    source = JSON.parse(rawText || "{}");
    if (Array.isArray(source)) source = {};
  } catch {
    source = {};
  }
  const normalizedSource = Object.fromEntries(
    Object.entries(source).map(([key, value]) => [
      key.toLowerCase().replace(/[^a-z0-9]/g, ""),
      value,
    ])
  );
  const first = rows[0] || {};
  return Object.fromEntries(
    Object.entries(FIELD_ALIASES).map(([key, aliases]) => {
      const raw =
        aliases
          .map((alias) => normalizedSource[alias.toLowerCase().replace(/[^a-z0-9]/g, "")])
          .find((v) => v !== undefined && v !== null && v !== "") ??
        (key === "monthlyPayment" ? first.standardPayment : null) ??
        (key === "startDate" ? first.startDate || first.monthLabel : null) ??
        null;
      const hasValue = raw !== null && raw !== undefined && raw !== "";
      return [
        key,
        fieldRecord(
          hasValue ? normalizeValue(key, raw) : null,
          hasValue ? 0.85 : 0,
          hasValue ? FIELD_STATUS.FOUND : FIELD_STATUS.NOT_FOUND,
          hasValue ? `Document field: ${aliases[0]}` : "Not found in document"
        ),
      ];
    })
  );
}

function fieldRecord(value, confidence, status, evidence = "Manual review") {
  return { originalValue: value, normalizedValue: value, userCorrectedValue: null, confidence, status, evidence };
}

function normalizeValue(key, value) {
  if (value === null || value === undefined || value === "") return null;
  if (key === "chitName" || key === "startDate" || key === "endDate") {
    return String(value).trim();
  }
  const num = Number(String(value).replace(/[^\d.-]/g, ""));
  return isNaN(num) ? null : num;
}

function normalizeScheduleRow(row, index = 0) {
  // SAFETY: row could be a non-object (number, string, null, array, etc.).
  // Guard against spread on non-iterable by ensuring it's a plain object.
  const safeRow = (row && typeof row === "object" && !Array.isArray(row)) ? row : {};

  const toNum = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };
  return {
    monthNumber: toNum(safeRow.monthNumber || safeRow.month) || index + 1,
    monthLabel: safeRow.monthLabel || `Month ${toNum(safeRow.monthNumber || safeRow.month) || index + 1}`,
    standardPayment: toNum(safeRow.standardPayment || safeRow.payment || safeRow.monthlyPayment),
    nonLiftedPayment: toNum(safeRow.nonLiftedPayment || safeRow.non_lifted_payment || safeRow.payment),
    liftedPayment: toNum(safeRow.liftedPayment || safeRow.lifted_payment || safeRow.payment),
    prizeAmount: toNum(safeRow.prizeAmount || safeRow.prize),
    bidAmount: toNum(safeRow.bidAmount || safeRow.bid),
    dividendPerMember: toNum(safeRow.dividendPerMember || safeRow.dividend),
    commissionValue: toNum(safeRow.commissionValue || safeRow.commission),
    deposit: toNum(safeRow.deposit || safeRow.security_deposit),
    otherDeductions: toNum(safeRow.otherDeductions || safeRow.other_deductions),
    netAmount: toNum(safeRow.netAmount || safeRow.net_amount),
    status: safeRow.status || "Needs Review",
    confidence: Number(safeRow.confidence || 0.6),
    evidence: safeRow.evidence || `Imported row ${index + 1}`,
    isUserConfirmed: Boolean(safeRow.isUserConfirmed),
  };
}

function verifyConstant(rows, field) {
  const applicable = rows.filter((row) => row[field] !== null && Number.isFinite(Number(row[field])));
  if (!applicable.length) return null;
  const values = applicable.map((row) => Number(row[field]));
  const first = values[0];
  const matches = values.filter((value) => value === first).length;
  const ratio = matches / values.length;
  return {
    field,
    type: ratio === 1 ? "Fixed relationship" : "Custom month-wise values",
    value: ratio === 1 ? first : null,
    matchedRows: matches,
    totalRows: values.length,
    status: ratio === 1 ? "Verified" : ratio >= 0.7 ? "Probable" : "Custom Values",
    confidence: ratio,
    evidence: `Tested ${values.length} applicable rows`,
  };
}

function humanize(key) {
  return key.replace(/([A-Z])/g, " $1").toLowerCase();
}

function audit(action, details) {
  return { action, details, at: new Date().toISOString() };
}
