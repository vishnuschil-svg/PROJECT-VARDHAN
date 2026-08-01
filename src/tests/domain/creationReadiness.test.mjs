import test from "node:test";
import assert from "node:assert/strict";
import { evaluateCreationReadiness, createChitFromBusinessUnderstanding } from "../../services/universalBusinessRuleService.js";
import { REQUIRED_SCHEDULE_COLUMNS } from "../../domain/chit/validation/ValidationService.js";

function draft() {
  const field = (value) => ({ value, state: "OWNER_DEFINED" });
  const schedule = [1, 2].map((monthNumber) => Object.fromEntries(REQUIRED_SCHEDULE_COLUMNS.map((key) => [key, {
    monthNumber, standardPayment: 1000, liftedPayment: 800, prizeAmount: 1800, commissionValue: 100,
    dividendPerMember: 50, penalty: 10, deposit: 200, bidAmount: 100, otherDeductions: 0, netAmount: 1700,
  }[key] ?? null])));
  return {
    business: { chitName: field("Ready Chit"), chitValue: field(2000), duration: field(2), memberCount: field(2), installmentPattern: field("FIXED_MONTHLY") },
    financialPrimitives: { bidRule: field("AUCTION"), commission: field(100), dividend: field(50), penalty: field(10), liftRule: field("NEXT_MONTH"), deposit: field(200) },
    schedule, members: [], rules: { detected: [], notDetected: [] }, confidence: {},
    workspace: { ownerConfirmed: false, auditLog: [], ownerChanges: [] },
  };
}

test("creation readiness requires all six mandatory gates", () => {
  const pending = evaluateCreationReadiness(draft());
  assert.equal(pending.ready, false);
  assert.equal(pending.ownerApprovalStatus, "PENDING");
  const ready = evaluateCreationReadiness(draft(), { ownerApproved: true });
  assert.deepEqual({
    validation: ready.validationStatus, dsl: ready.dslMappingStatus, simulation: ready.simulationStatus,
    owner: ready.ownerApprovalStatus, rules: ready.ruleEngineStatus, ledger: ready.ledgerStatus, ready: ready.ready,
  }, { validation: "VALID", dsl: "SUCCESS", simulation: "PASS", owner: "APPROVED", rules: "PASS", ledger: "READY", ready: true });
});

test("failed readiness blocks creation before repository access", () => {
  const invalid = draft();
  invalid.workspace.ownerConfirmed = true;
  invalid.business.chitValue.value = 0;
  assert.throws(() => createChitFromBusinessUnderstanding(invalid, { tenant_id: "test", data_scope: "test" }), /readiness gate failed/);
});
