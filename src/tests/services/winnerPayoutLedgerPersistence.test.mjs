import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createEntityId,
  fromProductionWinner,
  isUuid,
  toProductionAuction,
  toProductionLedgerEntry,
  toProductionLuckyDraw,
  toProductionPayout,
  toProductionWinner,
} from "../../services/productionChitPersistence.js";
import { buildAuthoritativeMemberLedger } from "../../services/ledgerService.js";
import { assertOperatorRole } from "../../services/winnerLifecyclePersistence.js";
import { AuctionValidator } from "../../domain/chit/validators/AuctionValidator.js";
import { LuckyDrawValidator } from "../../domain/chit/validators/LuckyDrawValidator.js";
import { PayoutEngine } from "../../domain/chit/services/PayoutEngine.js";

const groupId = "11111111-1111-4111-8111-111111111111";
const memberId = "22222222-2222-4222-8222-222222222222";

test("auction and lucky-draw mappers emit schema columns with UUID safety", () => {
  const auction = toProductionAuction({
    id: createEntityId(),
    chit_group_id: groupId,
    auction_month: 3,
    winner_member_id: memberId,
    bid_amount: 5000,
    prize_amount: 95000,
    payout_amount: 90000,
    dividend_amount: 500,
    status: "CONFIRMED",
  });
  assert.equal(auction.group_id, groupId);
  assert.equal(auction.lift_amount, 95000);
  assert.equal(auction.metadata.payout_amount, 90000);
  assert.equal("chit_group_id" in auction, false);

  const draw = toProductionLuckyDraw({
    id: "not-a-uuid",
    group_id: groupId,
    monthNumber: 2,
    member_id: memberId,
    prize_amount: 100000,
    random_value: 0.42,
    deterministic_seed: "seed-1",
  });
  assert.equal("id" in draw, false);
  assert.equal(draw.draw_month, 2);
  assert.equal(draw.metadata.random_value, 0.42);
});

test("winner mapper preserves lock metadata and UI aliases round-trip", () => {
  const id = createEntityId();
  const payload = toProductionWinner({
    id,
    groupId,
    memberId,
    monthNumber: 4,
    winnerMode: "AUCTION",
    payoutAmount: 88000,
    status: "CONFIRMED",
    idempotency_key: "winner:test:4",
  });
  assert.equal(payload.group_id, groupId);
  assert.equal(payload.member_id, memberId);
  assert.equal(payload.month_number, 4);
  assert.equal(payload.metadata.idempotency_key, "winner:test:4");
  assert.equal(payload.metadata.is_winner_locked, true);

  const ui = fromProductionWinner(payload);
  assert.equal(ui.groupId, groupId);
  assert.equal(ui.memberId, memberId);
  assert.equal(ui.monthNumber, 4);
  assert.equal(ui.payoutAmount, 88000);
});

test("duplicate winner prevention is enforced by auction and lucky-draw validators", () => {
  const existingWinners = [
    { groupId, monthNumber: 1, status: "CONFIRMED" },
  ];
  const auction = AuctionValidator.validateAuction({
    auction: { auction_month: 1, bid_amount: 1000 },
    group: { id: groupId, total_months: 12, status: "active" },
    scheduleRow: { monthNumber: 1, isUserConfirmed: true },
    ruleSet: { paymentPatternType: "FIXED" },
    member: { id: memberId, status: "active" },
    bidPreview: { bidValidation: { isValid: true }, payoutAmount: 1, commission: 0, dividend: 0 },
    existingWinners,
  });
  assert.equal(auction.isValid, false);
  assert.match(auction.errors.join(" "), /Duplicate auction or winner/);

  const draw = LuckyDrawValidator.validateDraw({
    group: { id: groupId, status: "active" },
    scheduleRow: { monthNumber: 1 },
    eligibleMembers: [{ id: memberId }],
    existingWinners,
  });
  assert.equal(draw.isValid, false);
});

test("payout mapper and engine support idempotent payment progression", () => {
  const plan = PayoutEngine.createPlan({
    id: createEntityId(),
    groupId,
    memberId,
    winnerId: createEntityId(),
    totalPayout: 1000,
    payoutMode: "FULL",
  });
  const paidOnce = PayoutEngine.applyPayment(plan, 400);
  const paidTwice = PayoutEngine.applyPayment(paidOnce, 600);
  assert.equal(paidOnce.status, "PARTIALLY_PAID");
  assert.equal(paidTwice.status, "PAID");
  assert.equal(paidTwice.paidAmount, 1000);

  const payload = toProductionPayout({
    ...paidTwice,
    reference_no: `payout-plan:${plan.winnerId}`,
  });
  assert.equal(payload.reference_no, `payout-plan:${plan.winnerId}`);
  assert.equal(payload.payout_amount, 1000);
  assert.equal(payload.paid_amount, 1000);
  assert.equal(payload.balance_amount, 0);
});

test("ledger entry mapper uses unique reference_no and authoritative ledger merges without duplicates", () => {
  const collectionId = createEntityId();
  const entry = toProductionLedgerEntry({
    group_id: groupId,
    member_id: memberId,
    collection_id: collectionId,
    entry_type: "collection",
    amount: 500,
    reference_no: `collection:${collectionId}`,
  });
  assert.equal(entry.reference_no, `collection:${collectionId}`);
  assert.equal(isUuid(collectionId), true);

  const ledger = buildAuthoritativeMemberLedger({
    member: { id: memberId, member_name: "Asha" },
    group: { id: groupId, monthly_amount: 1000, total_months: 10, start_date: "2026-01-01" },
    collections: [
      {
        id: collectionId,
        member_id: memberId,
        group_id: groupId,
        paid_amount: 500,
        payment_date: "2026-08-01",
        receipt_number: "R-1",
      },
    ],
    ledgerEntries: [
      {
        member_id: memberId,
        entry_type: "collection",
        amount: 500,
        reference_no: `collection:${collectionId}`,
      },
      {
        member_id: memberId,
        entry_type: "winner_lift",
        amount: 90000,
        reference_no: "winner:w1",
      },
      {
        member_id: memberId,
        entry_type: "payout",
        amount: 40000,
        reference_no: "payref:1",
      },
    ],
    winners: [
      {
        id: "w1",
        memberId,
        groupId,
        status: "CONFIRMED",
        payoutAmount: 90000,
      },
    ],
    payouts: [
      {
        member_id: memberId,
        group_id: groupId,
        status: "PARTIALLY_PAID",
        paid_amount: 40000,
      },
    ],
  });

  assert.equal(ledger.lift_amount, 90000);
  assert.equal(ledger.payout_paid, 40000);
  assert.equal(ledger.reload_consistent, true);
  assert.equal(ledger.authoritative_entries.length, 3);
  assert.ok(ledger.closing_balance >= 0);
});

test("unauthorized role denial helper blocks explicit false permissions", () => {
  assert.equal(
    assertOperatorRole({ actions: { confirm_winner: false } }, {}, "operator"),
    false
  );
  assert.equal(assertOperatorRole({ actions: { confirm_winner: true } }, {}, "viewer"), true);
  assert.equal(assertOperatorRole({}, { role: "owner" }, "owner"), true);
});

test("Batch 2 migration adds winners table, uniqueness, and transactional RPCs", async () => {
  const sql = await readFile(
    new URL("../../../supabase/migrations/007_chit_winner_payout_durability.sql", import.meta.url),
    "utf8"
  );
  assert.match(sql, /create table if not exists public\.chit_winners/);
  assert.match(sql, /uq_chit_winners_group_month_active/);
  assert.match(sql, /uq_chit_auctions_group_month_confirmed/);
  assert.match(sql, /uq_lucky_draws_group_month_confirmed/);
  assert.match(sql, /uq_chit_payouts_reference_no/);
  assert.match(sql, /confirm_chit_winner_event/);
  assert.match(sql, /record_chit_payout_payment/);
  assert.match(sql, /Unauthorized role for winner confirmation/);
  assert.match(sql, /idempotency_key/);
});

test("immutable confirmed history and authorized correction are enforced in migration 008", async () => {
  const sql = await readFile(
    new URL("../../../supabase/migrations/008_chit_winner_immutability.sql", import.meta.url),
    "utf8"
  );
  assert.match(sql, /enforce_chit_winner_immutability/);
  assert.match(sql, /Confirmed winner financial history is immutable/);
  assert.match(sql, /Confirmed winner history cannot be deleted/);
  assert.match(sql, /cancel_chit_winner_event/);
  assert.match(sql, /Unauthorized role for winner correction/);
  assert.match(sql, /Winner cancellation requires a reason/);
});

test("services route auction winner payout and ledger through persistent helpers", async () => {
  const files = await Promise.all([
    readFile(new URL("../../services/auctionService.js", import.meta.url), "utf8"),
    readFile(new URL("../../services/luckyDrawService.js", import.meta.url), "utf8"),
    readFile(new URL("../../services/winnerService.js", import.meta.url), "utf8"),
    readFile(new URL("../../services/payoutService.js", import.meta.url), "utf8"),
    readFile(new URL("../../services/winnerLifecyclePersistence.js", import.meta.url), "utf8"),
    readFile(new URL("../../services/collectionService.js", import.meta.url), "utf8"),
    readFile(new URL("../../services/chitDataService.js", import.meta.url), "utf8"),
  ]);
  const [auction, lucky, winner, payout, lifecycle, collection, chitData] = files;
  assert.match(auction, /listAuctionsPersistent/);
  assert.match(auction, /confirmWinnerResult/);
  assert.match(lucky, /listLuckyDrawsPersistent/);
  assert.match(winner, /confirmWinnerEventPersistent/);
  assert.match(winner, /cancelWinnerEventPersistent/);
  assert.doesNotMatch(winner, /WinnerRepository\.save/);
  assert.match(payout, /recordPayoutPaymentPersistent/);
  assert.match(lifecycle, /confirm_chit_winner_event/);
  assert.match(lifecycle, /record_chit_payout_payment/);
  assert.match(lifecycle, /cancel_chit_winner_event/);
  assert.match(collection, /saveLedgerEntryPersistent/);
  assert.match(collection, /reference_no: `collection:/);
  assert.match(chitData, /listTenantMembersPersistent/);
  assert.match(chitData, /saveCollectionRecordPersistent/);
  assert.match(chitData, /saveFinanceEntryPersistent/);
  assert.match(chitData, /saveReceiptRecordPersistent/);
});

test("production repository gate blocks localStorage financial backend", async () => {
  const { resolveRepositoryBackend, RepositoryConfigurationError } = await import(
    "../../config/repositoryBackend.js"
  );
  assert.throws(
    () =>
      resolveRepositoryBackend({
        VITE_APP_MODE: "production",
        VITE_REPOSITORY_BACKEND: "local",
      }),
    RepositoryConfigurationError
  );
  assert.equal(
    resolveRepositoryBackend({
      VITE_APP_MODE: "production",
      VITE_REPOSITORY_BACKEND: "supabase",
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_ANON_KEY: "anon",
    }),
    "supabase"
  );
});

test("transactional RPC payloads fail closed without auth and idempotency keys", async () => {
  const sql = await readFile(
    new URL("../../../supabase/migrations/007_chit_winner_payout_durability.sql", import.meta.url),
    "utf8"
  );
  assert.match(sql, /Authentication is required/);
  assert.match(sql, /idempotency_key is required/);
  assert.match(sql, /A winner is already locked for this chit month/);
  assert.match(sql, /for update/);
});

test("winner correction denies unauthorized roles and requires reason", async () => {
  const { cancelWinnerResult } = await import("../../services/winnerService.js");
  const denied = await cancelWinnerResult({
    winnerId: createEntityId(),
    reason: "mistake",
    activeTenantContext: { tenant_id: "t1", data_scope: "real_tenant" },
    role: "viewer",
    permissions: {},
  });
  assert.equal(denied.success, false);
  assert.match(denied.message, /Unauthorized/);

  const missingReason = await cancelWinnerResult({
    winnerId: createEntityId(),
    reason: "",
    activeTenantContext: { tenant_id: "t1", data_scope: "real_tenant" },
    role: "owner",
    permissions: { isPlatformOwner: true },
  });
  assert.equal(missingReason.success, false);
  assert.match(missingReason.message, /reason/i);
});
