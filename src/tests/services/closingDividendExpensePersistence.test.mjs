import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DividendEngine } from "../../domain/chit/services/DividendEngine.js";
import {
  createEntityId,
  fromProductionCompletion,
  fromProductionDividend,
  fromProductionExpense,
  fromProductionMonthClosing,
  isUuid,
  toProductionCompletion,
  toProductionDividend,
  toProductionExpense,
  toProductionMonthClosing,
} from "../../services/productionChitPersistence.js";
import {
  assertExpenseAuthorized,
  assertReopenAuthorized,
  postDividendBatchPersistent,
  postExpensePersistent,
  confirmMonthClosingPersistent,
  reopenMonthClosingPersistent,
  confirmChitCompletionPersistent,
  listDividendsPersistent,
  listExpensesPersistent,
  listMonthClosingsPersistent,
  listCompletionsPersistent,
} from "../../services/closingLifecyclePersistence.js";
import { previewMonthClosing, confirmMonthClosing } from "../../services/monthClosingService.js";
import {
  previewChitCompletion,
  confirmChitCompletion,
  activeSlotImpactAfterCompletion,
} from "../../services/chitCompletionService.js";
import { ActiveSlotEngine } from "../../domain/chit/ActiveSlotEngine.js";

const tenantA = { tenant_id: "tenant-a", data_scope: "own_business" };
const tenantB = { tenant_id: "tenant-b", data_scope: "own_business" };
const groupId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const memberA = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const memberB = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const memberC = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

class MemoryLocalStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.get(key) || null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

test("dividend allocation is accurate and rounding-consistent", () => {
  const result = DividendEngine.allocateMonthDividends({
    discount: 10000,
    commission: 1000,
    members: [{ id: memberA }, { id: memberB }, { id: memberC }, { id: "winner" }],
    winnerMemberId: "winner",
    excludeWinner: true,
  });
  assert.equal(result.pool, 9000);
  assert.equal(result.allocations.length, 3);
  assert.equal(
    result.allocations.reduce((total, row) => total + row.amount, 0),
    9000
  );
  assert.equal(result.rounding.method, "floor_rupee_with_remainder_to_first");
  assert.equal(result.perMember, 3000);
});

test("dividend and expense mappers emit schema columns with UUID safety", () => {
  const dividend = toProductionDividend({
    id: createEntityId(),
    groupId,
    memberId: memberA,
    dividendMonth: 2,
    amount: 500,
    idempotency_key: "div:1",
  });
  assert.equal(dividend.group_id, groupId);
  assert.equal(dividend.member_id, memberA);
  assert.equal(dividend.dividend_month, 2);
  assert.equal(dividend.metadata.idempotency_key, "div:1");
  assert.equal("groupId" in dividend, false);

  const expense = toProductionExpense({
    id: "not-uuid",
    groupId,
    category: "RENT",
    amount: 2500,
    paymentMode: "CASH",
    reference: "exp-1",
  });
  assert.equal("id" in expense, false);
  assert.equal(expense.payment_method, "CASH");
  assert.equal(expense.reference_no, "exp-1");

  const closing = toProductionMonthClosing({
    id: createEntityId(),
    groupId,
    monthNumber: 3,
    closingYear: 2026,
    status: "CLOSED",
    summary: { pending: 0 },
  });
  assert.equal(closing.closing_month, 3);
  assert.equal(closing.closing_year, 2026);

  const completion = toProductionCompletion({
    id: createEntityId(),
    groupId,
    status: "COMPLETED",
    snapshot: { exportReady: true },
  });
  assert.equal(completion.group_id, groupId);
  assert.equal(fromProductionCompletion(completion).groupId, groupId);
  assert.ok(isUuid(fromProductionDividend(dividend).id || dividend.id));
  assert.equal(fromProductionExpense({ ...expense, id: createEntityId() }).category, "RENT");
  assert.equal(fromProductionMonthClosing(closing).monthNumber, 3);
});

function installLocalStorage() {
  global.window = { localStorage: new MemoryLocalStorage() };
}

function uninstallLocalStorage() {
  delete global.window;
}

test("local dividend posting is idempotent and tenant scoped", async () => {
  installLocalStorage();
  const members = [{ id: memberA }, { id: memberB }];
  const first = await postDividendBatchPersistent(
    {
      group_id: groupId,
      dividend_month: 1,
      discount: 1000,
      commission: 100,
      members,
      excludeWinner: false,
      idempotency_key: "div-batch-1",
    },
    tenantA
  );
  const second = await postDividendBatchPersistent(
    {
      group_id: groupId,
      dividend_month: 1,
      discount: 1000,
      commission: 100,
      members,
      excludeWinner: false,
      idempotency_key: "div-batch-1",
    },
    tenantA
  );
  assert.equal(first.success, true);
  assert.equal(first.idempotent, false);
  assert.equal(second.idempotent, true);
  assert.equal(first.dividends.length, 2);
  assert.equal(
    first.dividends.reduce((total, row) => total + Number(row.amount || row.dividend_amount || 0), 0),
    900
  );

  await postDividendBatchPersistent(
    {
      group_id: groupId,
      dividend_month: 1,
      discount: 500,
      commission: 0,
      members: [{ id: memberA }],
      excludeWinner: false,
      idempotency_key: "div-batch-b",
    },
    tenantB
  );
  const aRows = await listDividendsPersistent(tenantA);
  const bRows = await listDividendsPersistent(tenantB);
  assert.equal(aRows.length, 2);
  assert.equal(bRows.length, 1);
  uninstallLocalStorage();
});

test("duplicate dividend for same member/month is rejected", async () => {
  installLocalStorage();
  await postDividendBatchPersistent(
    {
      group_id: groupId,
      dividend_month: 2,
      discount: 100,
      commission: 0,
      members: [{ id: memberA }],
      excludeWinner: false,
      idempotency_key: "div-dup-1",
    },
    tenantA
  );
  await assert.rejects(
    () =>
      postDividendBatchPersistent(
        {
          group_id: groupId,
          dividend_month: 2,
          discount: 50,
          commission: 0,
          members: [{ id: memberA }],
          excludeWinner: false,
          idempotency_key: "div-dup-2",
        },
        tenantA
      ),
    /Duplicate dividend/
  );
  uninstallLocalStorage();
});

test("expense authorization and finance side-effects", async () => {
  installLocalStorage();
  assert.equal(assertExpenseAuthorized({ actions: { manage_expenses: false } }), false);
  assert.equal(assertExpenseAuthorized({}, { role: "operator" }), true);

  const denied = await postExpensePersistent(
    { amount: 100, category: "RENT", paymentMode: "CASH" },
    tenantA,
    { permissions: { actions: { manage_expenses: false } } }
  );
  assert.equal(denied.success, false);

  const posted = await postExpensePersistent(
    {
      id: createEntityId(),
      amount: 1500,
      category: "RENT",
      paymentMode: "CASH",
      groupId,
      reference: "exp-auth-1",
      idempotency_key: "exp-1",
    },
    tenantA,
    { role: "operator" }
  );
  const again = await postExpensePersistent(
    {
      id: createEntityId(),
      amount: 1500,
      category: "RENT",
      paymentMode: "CASH",
      groupId,
      reference: "exp-auth-1",
      idempotency_key: "exp-1",
    },
    tenantA,
    { role: "operator" }
  );
  assert.equal(posted.success, true);
  assert.equal(again.idempotent, true);
  const listed = await listExpensesPersistent(tenantA);
  assert.equal(listed.length, 1);
  assert.equal(Number(listed[0].amount), 1500);
  uninstallLocalStorage();
});

test("month-close validation, duplicate prevention, reopen audit, and failed close rollback", async () => {
  installLocalStorage();

  const blocked = previewMonthClosing({
    groupId,
    monthNumber: 1,
    source: {},
    winners: [],
  });
  assert.equal(blocked.canClose, false);
  assert.match(blocked.issues.join(" "), /Winner/);

  const preview = previewMonthClosing({
    groupId,
    monthNumber: 1,
    source: {},
    winners: [{ groupId, monthNumber: 1, status: "CONFIRMED" }],
    payouts: [{ pendingAmount: 0 }],
  });
  assert.equal(preview.canClose, true);

  const closed = await confirmMonthClosing(
    {
      groupId,
      monthNumber: 1,
      source: {},
      winners: [{ groupId, monthNumber: 1, status: "CONFIRMED" }],
      payouts: [{ pendingAmount: 0 }],
      organizerConfirmed: true,
      idempotency_key: "close-1",
    },
    tenantA
  );
  assert.equal(closed.success, true);

  const duplicate = await confirmMonthClosingPersistent(
    {
      groupId,
      monthNumber: 1,
      closingYear: new Date().getFullYear(),
      organizerConfirmed: true,
      summary: preview.summary,
      idempotency_key: "close-2",
    },
    tenantA
  );
  assert.equal(duplicate.success, false);
  assert.match(duplicate.message || "", /already closed/);

  const failedClose = await confirmMonthClosing(
    {
      groupId,
      monthNumber: 2,
      source: {},
      winners: [],
      organizerConfirmed: true,
    },
    tenantA
  );
  assert.equal(failedClose.success, false);
  const closingsAfterFail = await listMonthClosingsPersistent(tenantA);
  assert.equal(
    closingsAfterFail.filter((row) => Number(row.monthNumber) === 2).length,
    0
  );

  assert.equal(assertReopenAuthorized({}, { role: "operator" }), false);
  assert.equal(assertReopenAuthorized({}, { role: "owner" }), true);

  const reopened = await reopenMonthClosingPersistent(
    closed.snapshot,
    { reason: "Correction required", hasPermission: true, reopenedBy: "owner-1" },
    tenantA
  );
  assert.equal(reopened.success, true);
  assert.equal(reopened.snapshot.status, "REOPENED");
  assert.equal(reopened.snapshot.reopenReason || reopened.snapshot.reopen_reason, "Correction required");
  uninstallLocalStorage();
});

test("closed-month blocks dividend posts", async () => {
  installLocalStorage();
  await confirmMonthClosingPersistent(
    {
      groupId,
      monthNumber: 4,
      closingYear: 2026,
      organizerConfirmed: true,
      summary: { groupId, monthNumber: 4 },
      idempotency_key: "close-4",
    },
    tenantA
  );
  await assert.rejects(
    () =>
      postDividendBatchPersistent(
        {
          group_id: groupId,
          dividend_month: 4,
          discount: 100,
          commission: 0,
          members: [{ id: memberA }],
          excludeWinner: false,
          idempotency_key: "div-after-close",
        },
        tenantA
      ),
    /closed month/i
  );
  uninstallLocalStorage();
});

test("chit completion readiness, snapshot persistence, and active slot reuse", async () => {
  installLocalStorage();
  const group = { id: groupId, total_months: 1, status: "active" };
  const preview = previewChitCompletion({
    group,
    monthClosings: [{ groupId, status: "CLOSED" }],
    payouts: [{ pendingAmount: 0 }],
    investorLedgers: [{ balance: 0 }],
    winners: [{ groupId, status: "CONFIRMED" }],
    collections: [{ pending_amount: 0 }],
    expenses: [{ amount: 100 }],
    dividends: [{ amount: 50 }],
  });
  assert.equal(preview.canComplete, true);
  assert.equal(preview.exportReady, true);

  const completed = await confirmChitCompletion(
    {
      group,
      monthClosings: [{ groupId, status: "CLOSED" }],
      payouts: [{ pendingAmount: 0 }],
      investorLedgers: [{ balance: 0 }],
      winners: [{ groupId, status: "CONFIRMED" }],
      collections: [{ pending_amount: 0 }],
      organizerConfirmed: true,
      idempotency_key: "complete-1",
    },
    tenantA
  );
  assert.equal(completed.success, true);
  const snapshots = await listCompletionsPersistent(tenantA);
  assert.equal(snapshots.length, 1);
  assert.equal(String(snapshots[0].status).toUpperCase(), "COMPLETED");

  const again = await confirmChitCompletionPersistent(
    {
      group,
      organizerConfirmed: true,
      snapshot: preview,
      idempotency_key: "complete-1",
    },
    tenantA
  );
  assert.equal(again.idempotent, true);

  const slots = activeSlotImpactAfterCompletion(
    [
      { id: groupId, status: "closed" },
      { id: "other", status: "active" },
    ],
    10
  );
  assert.equal(slots.activeSlotsUsed, 1);
  assert.equal(slots.reusableFromArchive, 1);
  assert.equal(ActiveSlotEngine.buildSlotState({ groups: [{ status: "closed" }], maxActiveSlots: 1 }).reusableSlots, 1);
  uninstallLocalStorage();
});

test("migration 009 defines closing durability RPCs and constraints", async () => {
  const sql = await readFile(
    new URL("../../../supabase/migrations/009_chit_closing_completion_durability.sql", import.meta.url),
    "utf8"
  );
  assert.match(sql, /post_chit_dividend_batch/);
  assert.match(sql, /post_chit_expense_event/);
  assert.match(sql, /confirm_month_closing_event/);
  assert.match(sql, /reopen_month_closing_event/);
  assert.match(sql, /confirm_chit_completion_event/);
  assert.match(sql, /uq_chit_dividends_member_month_active/);
  assert.match(sql, /uq_chit_completions_group_active/);
  assert.match(sql, /enforce_month_closing_immutability/);
  assert.match(sql, /chit_completions/);
});
