export const RULE_ENGINE_STATUS = Object.freeze({ PASS: "PASS", FAIL: "FAIL" });
export const RULE_ENGINE_VERSION = "1.0.0";

const RULE_DEFINITIONS = Object.freeze([
  ["collection", "CollectionRule"],
  ["lift", "LiftRule"],
  ["commission", "CommissionRule"],
  ["dividend", "DividendRule"],
  ["penalty", "PenaltyRule"],
  ["deposit", "DepositRule"],
  ["afterLift", "AfterLiftRule"],
]);

export function executeBusinessRules(model) {
  if (!isBusinessDSLModel(model)) {
    return Object.freeze({
      status: RULE_ENGINE_STATUS.FAIL,
      engineVersion: RULE_ENGINE_VERSION,
      financialObjects: Object.freeze({}),
      errors: Object.freeze(["BusinessDSLModel is required."]),
    });
  }

  const errors = [];
  const financialObjects = Object.fromEntries(RULE_DEFINITIONS.map(([name, section]) => {
    const rule = model[section];
    if (!rule || typeof rule !== "object") errors.push(`${section} is required.`);
    return [name, createVersionedRule(name, section, rule || {})];
  }));

  financialObjects.schedule = Object.freeze(model.Schedule.map((row, index) => Object.freeze({
    ruleId: `schedule-month-${index + 1}`,
    ruleVersion: RULE_ENGINE_VERSION,
    monthNumber: row.monthNumber,
    collection: row.standardPayment,
    prize: row.prizeAmount,
    commission: row.commissionValue,
    dividend: row.dividendPerMember,
    penalty: row.penalty,
  })));

  return Object.freeze({
    status: errors.length ? RULE_ENGINE_STATUS.FAIL : RULE_ENGINE_STATUS.PASS,
    engineVersion: RULE_ENGINE_VERSION,
    financialObjects: Object.freeze(financialObjects),
    errors: Object.freeze(errors),
  });
}

function createVersionedRule(name, section, values) {
  return Object.freeze({
    ruleId: `${name}-rule`,
    ruleVersion: RULE_ENGINE_VERSION,
    sourceSection: section,
    values: deepFreeze({ ...values }),
  });
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function isBusinessDSLModel(model) {
  return Boolean(model && model.Business && Array.isArray(model.Schedule));
}

export const DeterministicRuleEngine = Object.freeze({ execute: executeBusinessRules });
export default DeterministicRuleEngine;
