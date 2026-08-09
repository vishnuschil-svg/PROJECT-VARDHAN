import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  REGISTERED_OPERATIONS_ENABLED,
  resolveRegisteredOperationsFlags,
  hasRegisteredOperationsAccess,
} from "../../config/groupManagerSafety.js";
import { AuctionEngine } from "../../domain/chit/services/AuctionEngine.js";
import { LuckyDrawEngine } from "../../domain/chit/services/LuckyDrawEngine.js";
import { PayoutEngine } from "../../domain/chit/services/PayoutEngine.js";
import { createDistributionRecord, createManualBidRecord } from "../../domain/groupManager/manualRecords.js";
import { aiOrchestrator } from "../../services/ai/AIOrchestrator.js";

test("REGISTERED_OPERATIONS_ENABLED defaults false", () => {
  assert.equal(REGISTERED_OPERATIONS_ENABLED, false);
  assert.deepEqual(resolveRegisteredOperationsFlags({}), {
    REGISTERED_OPERATIONS_ENABLED: false,
    AUTOMATED_AUCTION_ENABLED: false,
    AUTOMATED_LUCKY_DRAW_ENABLED: false,
    AUTOMATED_WINNER_SELECTION_ENABLED: false,
  });
});

test("top-level false overrides every enabled child flag", () => {
  const flags = resolveRegisteredOperationsFlags({
    VITE_REGISTERED_OPERATIONS_ENABLED: "false",
    VITE_AUTOMATED_AUCTION_ENABLED: "true",
    VITE_AUTOMATED_LUCKY_DRAW_ENABLED: "true",
    VITE_AUTOMATED_WINNER_SELECTION_ENABLED: "true",
  });
  assert.equal(Object.values(flags).some(Boolean), false);
});

test("legacy auction and lucky-draw direct routes use the feature guard", () => {
  const routes = read("../../routes/AppRouter.jsx");
  for (const route of ["/chits/auctions", "/chits/lucky-draw", "/chits/payouts"]) {
    const index = routes.indexOf(`path=\"${route}\"`);
    assert.ok(index >= 0);
    assert.match(routes.slice(index, index + 280), /RegisteredOperationsGuard/);
  }
});

test("direct URL guard redirects without rendering legacy children", () => {
  const guard = read("../../routes/guards/RegisteredOperationsGuard.jsx");
  assert.match(guard, /!isRegisteredOperationEnabled\(operation\)/);
  assert.match(guard, /!hasRegisteredOperationsAccess/);
  assert.match(guard, /Navigate to="\/chits\/manual-records"/);
  assert.ok(guard.indexOf("return <Navigate") < guard.indexOf("return children"));
});

test("automated auction engine refuses default execution", () => {
  assert.throws(() => AuctionEngine.buildAuctionPreview({ group: { chit_value: 100000 }, bidAmount: 80000 }), hasDisabledCode);
});

test("automated winner and lucky-draw selection refuse default execution", () => {
  assert.throws(() => AuctionEngine.buildWinnerResult({ member: { id: "m1" }, group: { id: "g1" } }), hasDisabledCode);
  assert.throws(() => LuckyDrawEngine.selectWinner({ eligibleMembers: [{ id: "m1" }] }), hasDisabledCode);
  assert.throws(() => LuckyDrawEngine.buildResult({ member: { id: "m1" }, group: { id: "g1" } }), hasDisabledCode);
});

test("automatic payout outcome planning refuses default execution", () => {
  assert.throws(() => PayoutEngine.createPlan({ payoutAmount: 50000 }), hasDisabledCode);
});

test("platform permission alone cannot bypass a false feature flag", () => {
  assert.equal(hasRegisteredOperationsAccess({ permissions: { isPlatformOwner: true, REGISTERED_OPERATIONS_ACCESS: true } }), false);
});

test("legacy navigation definitions are preserved but hidden by default", async () => {
  const { CHIT_MENU, FEATURE_BANK_REGISTERED_OPERATIONS_MENU } = await import("../../components/chit/ChitNavigation.menu.js");
  assert.equal(FEATURE_BANK_REGISTERED_OPERATIONS_MENU.length, 3);
  assert.equal(CHIT_MENU.some((item) => ["/chits/auctions", "/chits/lucky-draw", "/chits/payouts"].includes(item.path)), false);
  assert.equal(CHIT_MENU.some((item) => item.path === "/chits/manual-records"), true);
  assert.equal(CHIT_MENU.some((item) => item.path === "/chits/distributions"), true);
});

test("default customer action surfaces do not link to disabled registered operations", () => {
  const forbidden = /\/chits\/(auctions|lucky-draw|payouts)/;
  for (const source of [
    "../../pages/chits/ChitDashboard.jsx",
    "../../pages/chits/ChitGroups.jsx",
    "../../components/dashboard/BusinessHealthDashboard.jsx",
    "../../services/chitDashboardService.js",
    "../../services/aiInsightsService.js",
    "../../services/trialRunService.js",
    "../../services/winnerService.js",
  ]) assert.doesNotMatch(read(source), forbidden, source);
  for (const source of ["../../services/activityService.js", "../../services/notificationService.js"]) {
    const content = read(source);
    assert.match(content, /safeActionRoute/);
    assert.match(content, /ROUTES\.MANUAL_RECORDS/);
  }
});

test("historical repositories and list services remain present and readable by contract", () => {
  const winnerService = read("../../services/winnerService.js");
  const luckyService = read("../../services/luckyDrawService.js");
  assert.match(winnerService, /export async function listWinnerResults/);
  assert.match(luckyService, /export async function listLuckyDrawResults/);
  assert.match(read("../../repositories/supabase/AuctionRepository.js"), /tableName: "chit_auctions"/);
  assert.match(read("../../repositories/supabase/WinnersRepository.js"), /tableName: "chit_winners"/);
});

test("Manual Bid and Distribution record contracts remain operational", () => {
  const context = { tenantId: "tenant-a", userId: "user-a", now: "2026-08-09T00:00:00.000Z" };
  const manual = createManualBidRecord({ groupId: "g1", periodId: "2026-08", memberEntries: [{ memberId: "m1", recordedAmount: 70000 }], declaredRecipientMemberId: "m1", recordedDistributionAmount: 80000, recordDate: "2026-08-09", confirmedExternalDecision: true }, context);
  const distribution = createDistributionRecord({ groupId: "g1", periodId: "2026-08", recipientMemberId: "m1", distributionAmount: 80000, distributionDate: "2026-08-09", sourceRecordId: "manual-1" }, context);
  assert.equal(manual.decision_source, "EXTERNAL_ORGANIZER_DECISION");
  assert.equal(distribution.source_type, "MANUAL_BID_RECORD");
});

test("AI refuses automated decisions and guides users to manual records", () => {
  const result = aiOrchestrator.route({ text: "Select the auction winner from these bidders", tenantContext: { tenant_id: "tenant-a", data_scope: "real_tenant" }, permissions: { ai: true } });
  assert.equal(result.status, "blocked");
  assert.match(result.message, /Manual Records or Distribution Records/);
  assert.equal(result.action.route, "/chits/manual-records");
});

test("Batch 3 remains unchanged while later billing closure migration stays isolated", () => {
  const migrations = fs.readdirSync(new URL("../../../supabase/migrations/", import.meta.url));
  assert.equal(migrations.includes("016_saas_billing_receipts.sql"), true);
  const closure = fs.readFileSync(new URL("../../../supabase/migrations/016_saas_billing_receipts.sql", import.meta.url), "utf8");
  assert.doesNotMatch(closure, /public\.(chit_auctions|lucky_draws|manual_bid_records|distribution_records)/i);
  for (const legacy of ["007_chit_winner_payout_durability.sql", "008_chit_winner_immutability.sql"]) {
    assert.equal(migrations.includes(legacy), true);
    assert.ok(fs.readFileSync(new URL(`../../../supabase/migrations/${legacy}`, import.meta.url), "utf8").length > 100);
  }
});

function read(relativePath) {
  return fs.readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function hasDisabledCode(error) {
  return error?.code === "REGISTERED_OPERATIONS_DISABLED";
}
