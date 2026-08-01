import test from "node:test";
import assert from "node:assert/strict";
import { mapDraftToBusinessDSL } from "../../domain/chit/dsl/BusinessDSLMapper.js";
import { BUSINESS_DSL_SECTIONS } from "../../domain/chit/dsl/BusinessDSLModel.js";
import { REQUIRED_SCHEDULE_COLUMNS } from "../../domain/chit/validation/ValidationService.js";

function validDraft() {
  const field = (value) => ({ value, state: "OWNER_DEFINED" });
  const schedule = [1, 2].map((monthNumber) => Object.fromEntries(
    REQUIRED_SCHEDULE_COLUMNS.map((key) => [key, key === "monthNumber" ? monthNumber : key === "standardPayment" ? 1000 : null])
  ));
  return {
    business: {
      chitName: field("DSL Chit"), chitValue: field(2000), duration: field(2), memberCount: field(2),
      installmentPattern: field("FIXED_MONTHLY"), startDate: field("2026-08-01"), endDate: field("2026-09-01"),
    },
    financialPrimitives: {
      bidRule: field("AUCTION"), commission: field(5), dividend: field(100), penalty: field(25),
      liftRule: field("NEXT_MONTH"), deposit: field(200), prizeRule: field("MONTHLY"),
    },
    schedule,
    members: [{ name: "Member One", confidence: 0.9 }],
    rules: { detected: [], notDetected: [] },
    confidence: { business: {}, financialPrimitives: {}, schedule: 1, members: 0.9 },
    workspace: { ownerConfirmed: false, ownerChanges: [], auditLog: [] },
  };
}

test("maps a valid DraftBusinessModel into only the approved DSL sections", () => {
  const result = mapDraftToBusinessDSL(validDraft());
  assert.equal(result.status, "SUCCESS");
  assert.deepEqual(Object.keys(result.model), BUSINESS_DSL_SECTIONS);
  assert.deepEqual(result.model.Business.chitValue, {
    sourceField: "business.chitValue", confidence: 1, originalValue: 2000,
  });
  assert.equal(result.model.Schedule[0].standardPayment.sourceField, "schedule[0].standardPayment");
  assert.equal(result.model.Members[0].name.originalValue, "Member One");
});

test("mapping never mutates the draft and performs no calculation", () => {
  const draft = validDraft();
  const before = JSON.stringify(draft);
  const result = mapDraftToBusinessDSL(draft);
  assert.equal(JSON.stringify(draft), before);
  assert.equal(result.model.CollectionRule.monthlyValues[0].originalValue, 1000);
});

test("invalid or unsupported drafts return UNSUPPORTED_PATTERN without a model", () => {
  const draft = validDraft();
  draft.business.installmentPattern.value = "DAILY_ROLLOVER";
  const result = mapDraftToBusinessDSL(draft);
  assert.equal(result.status, "UNSUPPORTED_PATTERN");
  assert.equal(result.model, null);
  assert.ok(result.unsupportedRules.length > 0);
});
