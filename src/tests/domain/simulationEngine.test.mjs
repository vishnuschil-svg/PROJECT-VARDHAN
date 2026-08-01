import test from "node:test";
import assert from "node:assert/strict";
import { simulateBusinessDSL } from "../../domain/chit/simulation/SimulationEngine.js";
import { mapDraftToBusinessDSL } from "../../domain/chit/dsl/BusinessDSLMapper.js";
import { REQUIRED_SCHEDULE_COLUMNS } from "../../domain/chit/validation/ValidationService.js";

function model() {
  const field = (value) => ({ value, state: "OWNER_DEFINED" });
  const rows = [1000, 1200].map((payment, index) => Object.fromEntries(
    REQUIRED_SCHEDULE_COLUMNS.map((key) => [key, {
      monthNumber: index + 1, standardPayment: payment, liftedPayment: 800, prizeAmount: 1800,
      dividendPerMember: 50, commissionValue: 100, penalty: 10,
    }[key] ?? null])
  ));
  const draft = {
    business: { chitName: field("Simulation"), chitValue: field(4000), duration: field(2), memberCount: field(2), installmentPattern: field("VARIABLE_MONTHLY") },
    financialPrimitives: { bidRule: field("AUCTION"), commission: field(100), dividend: field(50), penalty: field(10), liftRule: field("NEXT_MONTH"), deposit: field(200) },
    schedule: rows, members: [], rules: { detected: [], notDetected: [] }, confidence: {}, workspace: {},
  };
  const mapped = mapDraftToBusinessDSL(draft);
  if (!mapped.model) throw new Error(JSON.stringify(mapped));
  return mapped.model;
}

test("simulates all required report values from BusinessDSLModel", () => {
  const result = simulateBusinessDSL(model());
  assert.equal(result.status, "PASS", JSON.stringify(result));
  assert.equal(result.monthlyCollections[0].monthlyCollection, 2000);
  assert.equal(result.totals.monthlyCollections, 4400);
  assert.equal(result.prizeAmount, 3600);
  assert.equal(result.lift, 1600);
  assert.equal(result.dividend, 200);
  assert.equal(result.commission, 200);
  assert.equal(result.penalty, 20);
  assert.equal(result.ownerProfit, 220);
});

test("simulation is deterministic, immutable, and rejects invalid input", () => {
  const input = model();
  assert.deepEqual(simulateBusinessDSL(input), simulateBusinessDSL(input));
  assert.equal(simulateBusinessDSL(null).status, "FAIL");
  assert.throws(() => { simulateBusinessDSL(input).warnings.push("write"); }, TypeError);
});
