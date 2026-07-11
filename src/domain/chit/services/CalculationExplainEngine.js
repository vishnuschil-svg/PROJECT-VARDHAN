export const CalculationExplainEngine = {
  explainPayable(resolution = {}) {
    return {
      type: "PAYABLE",
      value: resolution.finalPayable,
      scheduleMonth: resolution.sourceReferences?.scheduleRowId || "",
      memberState: resolution.sourceReferences?.memberState || "",
      appliedRule: resolution.ruleTrace?.join(" | ") || "",
      steps: resolution.explanation,
      manualOverrides: resolution.warnings || [],
      source: resolution.sourceReferences,
      warning: resolution.warnings?.[0] || "",
    };
  },

  explainValue({ type, value, scheduleRow = {}, memberState = {}, rule = "", steps = [], source = "" } = {}) {
    return {
      type,
      value,
      scheduleMonth: scheduleRow.monthNumber || "",
      memberState: memberState.status || "",
      appliedRule: rule,
      steps,
      manualOverrides: [],
      source,
      warning: "",
    };
  },
};
