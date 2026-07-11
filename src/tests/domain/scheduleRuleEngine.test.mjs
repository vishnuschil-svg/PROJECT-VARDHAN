import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ScheduleEngine } from "../../domain/chit/services/ScheduleEngine.js";
import { PayableResolutionEngine } from "../../domain/chit/services/PayableResolutionEngine.js";
import { RuleEngine } from "../../domain/chit/services/RuleEngine.js";
import { ScheduleValidator } from "../../domain/chit/validators/ScheduleValidator.js";
import { ManualOverrideEngine } from "../../domain/chit/services/ManualOverrideEngine.js";
import { CalculationExplainEngine } from "../../domain/chit/services/CalculationExplainEngine.js";
import { oneLakhTwentyMonthLiftedFixture, twoLakhCompanyMonthFixture } from "../fixtures/chitScheduleFixtures.mjs";

describe("schedule-driven chit rule engine", () => {
  it("adapts legacy fixed monthly groups into confirmed schedule rows", () => {
    const rows = ScheduleEngine.fromLegacyGroup(oneLakhTwentyMonthLiftedFixture.group);

    assert.equal(rows.length, 20);
    assert.equal(rows[0].standardPayment, 5000);
    assert.equal(rows[0].sourceType, "LEGACY_FIXED_ADAPTER");
    assert.equal(rows[0].isUserConfirmed, true);
  });

  it("resolves lifted member payable from next month", () => {
    const resolution = PayableResolutionEngine.resolve({
      group: oneLakhTwentyMonthLiftedFixture.group,
      ruleSet: oneLakhTwentyMonthLiftedFixture.ruleSet,
      scheduleRow: oneLakhTwentyMonthLiftedFixture.scheduleRowMonth5,
      memberState: oneLakhTwentyMonthLiftedFixture.liftedMemberState,
      installmentMonth: 5,
    });

    assert.equal(resolution.finalPayable, 6000);
    assert.match(resolution.explanation, /lifted/);
  });

  it("locks lifted winners from future selection", () => {
    const result = RuleEngine.canMemberWin({
      memberState: oneLakhTwentyMonthLiftedFixture.liftedMemberState,
      ruleSet: oneLakhTwentyMonthLiftedFixture.ruleSet,
    });

    assert.equal(result.eligible, false);
  });

  it("validates company month and bid schedule without errors", () => {
    const result = ScheduleValidator.validate(twoLakhCompanyMonthFixture.schedule, twoLakhCompanyMonthFixture.ruleSet);

    assert.equal(result.isValid, true);
  });

  it("creates audit-ready manual overrides and explain output", () => {
    const override = ManualOverrideEngine.createOverride({
      originalValue: 5000,
      newValue: 5200,
      reason: "Owner corrected captured value",
      affectedMonth: 3,
      targetType: "SCHEDULE_ROW",
      targetId: "row-3",
    });
    const explanation = CalculationExplainEngine.explainValue({
      type: "PAYABLE",
      value: 5200,
      steps: ["Owner override applied after review."],
      source: "manual_override",
    });

    assert.equal(override.status, "CONFIRMED");
    assert.equal(explanation.value, 5200);
  });
});
