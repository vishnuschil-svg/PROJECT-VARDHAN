export const BUSINESS_DSL_STATUS = Object.freeze({
  SUCCESS: "SUCCESS",
  UNSUPPORTED_PATTERN: "UNSUPPORTED_PATTERN",
});

export const BUSINESS_DSL_SECTIONS = Object.freeze([
  "Business",
  "Members",
  "Schedule",
  "CollectionRule",
  "LiftRule",
  "CommissionRule",
  "DividendRule",
  "PenaltyRule",
  "DepositRule",
  "AfterLiftRule",
]);

export function createDSLField(sourceField, confidence, originalValue) {
  return Object.freeze({
    sourceField,
    confidence: normalizeConfidence(confidence),
    originalValue: originalValue ?? null,
  });
}

export function createBusinessDSLModel(sections) {
  const model = {};
  BUSINESS_DSL_SECTIONS.forEach((section) => {
    model[section] = sections[section];
  });
  return Object.freeze(model);
}

function normalizeConfidence(value) {
  const confidence = Number(value);
  if (!Number.isFinite(confidence)) return 0;
  return Math.min(Math.max(confidence, 0), 1);
}

export default createBusinessDSLModel;
