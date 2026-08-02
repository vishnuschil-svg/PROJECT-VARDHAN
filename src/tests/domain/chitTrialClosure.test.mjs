import test from "node:test";
import assert from "node:assert/strict";
import {
  CHIT_TRIAL_PLANS,
  canActivateAnotherChit,
  countActiveChits,
  trialAccessMode,
} from "../../config/chitTrialPlans.js";
import { buildChitGroupsSummary } from "../../services/chitGroupsSummaryService.js";
import {
  displayChitCode,
  displayChitName,
  formatChitDate,
  formatINR,
  formatTenureProgress,
} from "../../utils/chitDisplayFormat.js";
import { ActiveSlotEngine } from "../../domain/chit/ActiveSlotEngine.js";

test("trial catalog exposes ₹99 / ₹199 / ₹299 with 30-day limits", () => {
  assert.equal(CHIT_TRIAL_PLANS.length, 3);
  assert.deepEqual(
    CHIT_TRIAL_PLANS.map((plan) => [plan.priceInr, plan.durationDays, plan.maxActiveChits]),
    [
      [99, 30, 1],
      [199, 30, 3],
      [299, 30, null],
    ]
  );
});

test("completed and archived groups do not consume active trial slots", () => {
  const groups = [
    { id: "1", status: "active" },
    { id: "2", status: "upcoming" },
    { id: "3", status: "closed" },
    { id: "4", status: "archived" },
  ];
  assert.equal(countActiveChits(groups), 2);
  const gate = canActivateAnotherChit({ groups, planId: "trial-199" });
  assert.equal(gate.allowed, true);
  assert.equal(gate.used, 2);
  assert.equal(gate.max, 3);
  const blocked = canActivateAnotherChit({
    groups: [...groups, { id: "5", status: "active" }],
    planId: "trial-199",
  });
  assert.equal(blocked.allowed, false);
});

test("trial expiry preserves data in read-only mode", () => {
  const access = trialAccessMode({ status: "trial", expiresOn: "2020-01-01" });
  assert.equal(access.mode, "READ_ONLY");
  assert.match(access.message, /preserved/i);
});

test("groups summary uses real data and em dash when unavailable", () => {
  const summary = buildChitGroupsSummary({
    groups: [
      {
        id: "g1",
        status: "active",
        chit_value: 100000,
        monthly_amount: 5000,
        total_members: 20,
        pending_collections: 2500,
      },
    ],
    collections: [],
  });
  assert.equal(summary.totalActiveGroups, 1);
  assert.equal(summary.totalPortfolioValue, 100000);
  assert.equal(summary.thisMonthCollectionTarget, 100000);
  assert.equal(summary.pendingPaymentAmount, 2500);
  assert.equal(summary.cards[1].display, "₹1,00,000");

  const empty = buildChitGroupsSummary({ groups: [], collections: [] });
  assert.equal(empty.cards[1].display, "—");
  assert.equal(empty.cards[2].display, "—");
});

test("chit code and name are never swapped", () => {
  assert.equal(displayChitCode({ chit_code: "VGC-01", chit_name: "Gold Chit" }), "VGC-01");
  assert.equal(displayChitName({ chit_code: "VGC-01", chit_name: "Gold Chit" }), "Gold Chit");
  assert.equal(displayChitName({ chit_code: "VGC-01", chit_name: "VGC-01" }), "Unnamed Chit");
  assert.equal(displayChitName({ chit_name: "" }), "Unnamed Chit");
  assert.equal(formatChitDate("2026-01-15"), "15 Jan 2026");
  assert.equal(formatChitDate(""), "—");
  assert.equal(formatINR(null), "—");
  assert.equal(formatTenureProgress({ total_months: 12, current_month: 4 }), "Month 4 / 12");
});

test("active slot engine ignores completed groups", () => {
  const state = ActiveSlotEngine.buildSlotState({
    groups: [
      { status: "active" },
      { status: "closed" },
      { status: "archived" },
    ],
    maxActiveSlots: 1,
  });
  assert.equal(state.activeSlotsUsed, 1);
  assert.equal(state.canReuseActiveSlot, false);
});
