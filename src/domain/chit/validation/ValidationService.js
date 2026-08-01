/**
 * Strict, side-effect-free validation boundary for DraftBusinessModel.
 * This module never reads OCR output, AI responses, repositories, or engines.
 */

export const VALIDATION_STATUS = Object.freeze({
  VALID: "VALID",
  INVALID: "INVALID",
  NEEDS_OWNER_CONFIRMATION: "NEEDS_OWNER_CONFIRMATION",
  UNSUPPORTED_PATTERN: "UNSUPPORTED_PATTERN",
});

const REQUIRED_BUSINESS_FIELDS = Object.freeze([
  "chitName",
  "chitValue",
  "duration",
  "memberCount",
  "installmentPattern",
]);

const POSITIVE_NUMBER_FIELDS = new Set(["chitValue", "duration", "memberCount"]);

export const REQUIRED_SCHEDULE_COLUMNS = Object.freeze([
  "monthNumber",
  "standardPayment",
  "nonLiftedPayment",
  "liftedPayment",
  "prizeAmount",
  "commissionValue",
  "deposit",
  "dividendPerMember",
  "penalty",
  "bidAmount",
  "otherDeductions",
  "netAmount",
]);

const SCHEDULE_NUMERIC_COLUMNS = new Set(REQUIRED_SCHEDULE_COLUMNS);

const SUPPORTED_INSTALLMENT_PATTERNS = new Set([
  "FIXED",
  "FIXED_MONTHLY",
  "VARIABLE",
  "VARIABLE_MONTHLY",
  "MONTH_WISE_VARIABLE",
  "LIFTED_NON_LIFTED",
  "CUSTOM_RULE",
]);

const SUPPORTED_RULE_KEYS = new Set([
  "paymentPattern",
  "winnerSelection",
  "hasBidding",
  "hasCommission",
  "hasDividend",
  "hasPenalty",
  "liftMechanism",
  "hasDeposit",
  "prizePayout",
]);

function emptyResult(status = VALIDATION_STATUS.VALID) {
  return {
    status,
    errors: [],
    warnings: [],
    missingFields: [],
    unsupportedRules: [],
  };
}

function readBusinessValue(draft, field) {
  return draft?.business?.[field]?.value;
}

function hasValue(value) {
  return value !== null && value !== undefined && !(typeof value === "string" && value.trim() === "");
}

function normalizePattern(value) {
  return String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function addUnsupportedRules(draft, result) {
  const explicitUnsupported = [
    ...(Array.isArray(draft?.unsupportedRules) ? draft.unsupportedRules : []),
    ...(Array.isArray(draft?.rules?.unsupported) ? draft.rules.unsupported : []),
  ];

  explicitUnsupported.forEach((rule) => {
    const label = typeof rule === "string" ? rule : rule?.label || rule?.key;
    if (label) result.unsupportedRules.push(label);
  });

  (draft?.rules?.detected || []).forEach((rule) => {
    if (rule?.key && !SUPPORTED_RULE_KEYS.has(rule.key)) {
      result.unsupportedRules.push(rule.label || rule.key);
    }
  });

  const pattern = readBusinessValue(draft, "installmentPattern");
  if (hasValue(pattern) && !SUPPORTED_INSTALLMENT_PATTERNS.has(normalizePattern(pattern))) {
    result.unsupportedRules.push(`Installment pattern: ${pattern}`);
  }

  result.unsupportedRules = [...new Set(result.unsupportedRules)];
}

/**
 * Validate a DraftBusinessModel and return the exact validation contract.
 *
 * @param {object} draft DraftBusinessModel only.
 * @returns {{status: "VALID"|"INVALID"|"NEEDS_OWNER_CONFIRMATION"|"UNSUPPORTED_PATTERN", errors: string[], warnings: string[], missingFields: string[], unsupportedRules: string[]}}
 */
export function validateDraft(draft) {
  const result = emptyResult();

  if (!draft || typeof draft !== "object" || Array.isArray(draft)) {
    result.status = VALIDATION_STATUS.INVALID;
    result.errors.push("DraftBusinessModel is required.");
    result.missingFields.push("draft");
    return result;
  }

  if (!draft.business || typeof draft.business !== "object" || Array.isArray(draft.business)) {
    result.errors.push("DraftBusinessModel.business is required.");
    result.missingFields.push(...REQUIRED_BUSINESS_FIELDS);
  } else {
    REQUIRED_BUSINESS_FIELDS.forEach((field) => {
      const value = readBusinessValue(draft, field);
      if (!hasValue(value)) {
        result.errors.push(`business.${field} must not be empty.`);
        result.missingFields.push(field);
        return;
      }

      if (POSITIVE_NUMBER_FIELDS.has(field)) {
        const number = Number(value);
        if (!Number.isFinite(number) || number <= 0) {
          result.errors.push(`business.${field} must be greater than zero.`);
        }
      }
    });
  }

  const schedule = Array.isArray(draft.schedule) ? draft.schedule : null;
  if (!schedule) {
    result.errors.push("schedule must be an array.");
    result.missingFields.push("schedule");
  } else {
    const duration = Number(readBusinessValue(draft, "duration"));
    if (Number.isFinite(duration) && duration > 0 && duration !== schedule.length) {
      result.errors.push(`business.duration (${duration}) must equal schedule length (${schedule.length}).`);
    }

    const seenMonths = new Set();
    schedule.forEach((row, index) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        result.errors.push(`schedule[${index}] must be an object.`);
        return;
      }

      REQUIRED_SCHEDULE_COLUMNS.forEach((column) => {
        if (!Object.prototype.hasOwnProperty.call(row, column)) {
          result.errors.push(`schedule[${index}].${column} is required.`);
          result.missingFields.push(`schedule[${index}].${column}`);
        }
      });

      const monthNumber = Number(row.monthNumber);
      if (!Number.isFinite(monthNumber) || monthNumber <= 0) {
        result.errors.push(`schedule[${index}].monthNumber must be greater than zero.`);
      } else if (seenMonths.has(monthNumber)) {
        result.errors.push(`schedule[${index}].monthNumber must be unique.`);
      } else {
        seenMonths.add(monthNumber);
      }

      SCHEDULE_NUMERIC_COLUMNS.forEach((column) => {
        const value = row[column];
        if (!hasValue(value)) return;
        const number = Number(value);
        if (!Number.isFinite(number)) {
          result.errors.push(`schedule[${index}].${column} must be numeric when provided.`);
        } else if (number < 0) {
          result.errors.push(`schedule[${index}].${column} must not be negative.`);
        }
      });
    });

    const pattern = normalizePattern(readBusinessValue(draft, "installmentPattern"));
    const payments = schedule
      .map((row) => row?.standardPayment)
      .filter(hasValue)
      .map(Number);
    if (payments.some((payment) => !Number.isFinite(payment) || payment <= 0)) {
      result.errors.push("Schedule installment amounts must be greater than zero when provided.");
    }
    if (
      (pattern === "FIXED" || pattern === "FIXED_MONTHLY")
      && payments.length > 1
      && new Set(payments).size > 1
    ) {
      result.errors.push("Fixed installment pattern requires the same standard payment for every configured month.");
    }
    if (
      (pattern === "VARIABLE" || pattern === "VARIABLE_MONTHLY" || pattern === "MONTH_WISE_VARIABLE")
      && payments.length > 1
      && new Set(payments).size === 1
    ) {
      result.warnings.push("Variable installment pattern has identical configured monthly payments; owner review is recommended.");
    }
  }

  const startDate = readBusinessValue(draft, "startDate");
  if (hasValue(startDate) && !isIsoDate(startDate)) {
    result.errors.push("business.startDate must be a valid date in YYYY-MM-DD format.");
  }

  ["commission"].forEach((field) => {
    const value = draft?.financialPrimitives?.[field]?.value;
    if (!hasValue(value)) return;
    const percentage = Number(value);
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      result.errors.push(`financialPrimitives.${field} must be a percentage from 0 to 100.`);
    }
  });

  result.missingFields = [...new Set(result.missingFields)];
  if (result.errors.length > 0) {
    result.status = VALIDATION_STATUS.INVALID;
    return result;
  }

  addUnsupportedRules(draft, result);
  if (result.unsupportedRules.length > 0) {
    result.status = VALIDATION_STATUS.UNSUPPORTED_PATTERN;
    result.warnings.push("One or more business rules are not supported by the current DSL.");
    return result;
  }

  return result;
}

function isIsoDate(value) {
  const text = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const parsed = new Date(`${text}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === text;
}

export default validateDraft;
