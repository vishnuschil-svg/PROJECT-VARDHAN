import test from "node:test";
import assert from "node:assert/strict";
import { executeBusinessRules, RULE_ENGINE_VERSION } from "../../domain/chit/rules/DeterministicRuleEngine.js";

const field = (sourceField, originalValue) => ({ sourceField, confidence: 1, originalValue });
const model = {
  Business: { memberCount: field("business.memberCount", 2) }, Members: [],
  Schedule: [{ monthNumber: field("schedule[0].monthNumber", 1), standardPayment: field("schedule[0].standardPayment", 1000), prizeAmount: field("schedule[0].prizeAmount", 1800), commissionValue: field("schedule[0].commissionValue", 100), dividendPerMember: field("schedule[0].dividendPerMember", 50), penalty: field("schedule[0].penalty", 10) }],
  CollectionRule: { installmentPattern: field("business.installmentPattern", "FIXED_MONTHLY") },
  LiftRule: { auction: field("financialPrimitives.bidRule", "AUCTION") },
  CommissionRule: { value: field("financialPrimitives.commission", 100) },
  DividendRule: { value: field("financialPrimitives.dividend", 50) },
  PenaltyRule: { value: field("financialPrimitives.penalty", 10) },
  DepositRule: { value: field("financialPrimitives.deposit", 200) },
  AfterLiftRule: { value: field("financialPrimitives.liftRule", "NEXT_MONTH") },
};

test("produces only deterministic versioned financial rule objects", () => {
  const result = executeBusinessRules(model);
  assert.equal(result.status, "PASS");
  assert.equal(result.engineVersion, RULE_ENGINE_VERSION);
  for (const rule of Object.values(result.financialObjects).filter((value) => !Array.isArray(value))) {
    assert.equal(rule.ruleVersion, RULE_ENGINE_VERSION);
  }
  assert.equal(result.financialObjects.collection.values.installmentPattern.originalValue, "FIXED_MONTHLY");
});

test("rule execution is deterministic and rejects a missing DSL model", () => {
  assert.deepEqual(executeBusinessRules(model), executeBusinessRules(model));
  assert.equal(executeBusinessRules(null).status, "FAIL");
});
