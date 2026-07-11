export const RuleSetValidator = {
  validate(ruleSet = {}) {
    const errors = [];
    const warnings = [];
    if (!ruleSet.paymentPatternType) errors.push("Payment pattern type is required.");
    if (!ruleSet.liftEffectiveRule) errors.push("Lift effective rule is required.");
    if (Number(ruleSet.minimumBidValue || 0) > Number(ruleSet.maximumBidValue || 0)) {
      errors.push("Minimum bid cannot be greater than maximum bid.");
    }
    if (!["FIXED_AMOUNT", "PERCENTAGE", "MONTH_WISE", "MANUAL", "CUSTOM"].includes(ruleSet.commissionType || "PERCENTAGE")) {
      errors.push("Invalid commission type.");
    }
    if (ruleSet.monthReopenRequiresPermission === false) {
      warnings.push("Month reopen without permission is risky.");
    }
    return { isValid: errors.length === 0, errors, warnings };
  },
};
