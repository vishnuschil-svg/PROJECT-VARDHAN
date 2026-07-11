export const VALIDATION_LEVELS = {
  ERROR: "ERROR",
  WARNING: "WARNING",
  INFO: "INFO",
};

export const ScheduleValidator = {
  validate(schedule = [], ruleSet = {}) {
    const issues = [];
    if (!schedule.length) {
      issues.push(error("Schedule rows are required."));
      return createResult(issues);
    }
    const months = schedule.map((row) => Number(row.monthNumber || 0));
    const uniqueMonths = new Set(months);
    if (uniqueMonths.size !== months.length) issues.push(error("Month numbers must be unique."));
    for (let month = 1; month <= schedule.length; month += 1) {
      if (!uniqueMonths.has(month)) issues.push(error(`Month ${month} is missing.`));
    }
    schedule.forEach((row) => {
      if (Number(row.monthNumber || 0) <= 0) issues.push(error("Month number must be positive."));
      if (hasNegativeValue(row)) issues.push(error(`Negative values are blocked in ${row.monthLabel || row.monthNumber}.`));
      if (!row.isUserConfirmed && row.confidence !== "HIGH") {
        issues.push(warning(`${row.monthLabel || `Month ${row.monthNumber}`} has unconfirmed or low-confidence values.`));
      }
      if (ruleSet.minimumBidValue && Number(row.bidPercentage || 0) && Number(row.bidPercentage) < Number(ruleSet.minimumBidValue)) {
        issues.push(error(`Month ${row.monthNumber} bid is below minimum.`));
      }
      if (ruleSet.maximumBidValue && Number(row.bidPercentage || 0) && Number(row.bidPercentage) > Number(ruleSet.maximumBidValue)) {
        issues.push(error(`Month ${row.monthNumber} bid is above maximum.`));
      }
    });
    return createResult(issues);
  },
};

function hasNegativeValue(row) {
  return [
    "standardPayment",
    "nonLiftedPayment",
    "liftedPayment",
    "prizeAmount",
    "payoutAmount",
    "bidAmount",
    "dividendPerMember",
    "commissionAmount",
  ].some((field) => Number(row[field] || 0) < 0);
}

function error(message) {
  return { level: VALIDATION_LEVELS.ERROR, message };
}

function warning(message) {
  return { level: VALIDATION_LEVELS.WARNING, message };
}

function createResult(issues) {
  return {
    isValid: !issues.some((issue) => issue.level === VALIDATION_LEVELS.ERROR),
    issues,
    errors: issues.filter((issue) => issue.level === VALIDATION_LEVELS.ERROR),
    warnings: issues.filter((issue) => issue.level === VALIDATION_LEVELS.WARNING),
  };
}
