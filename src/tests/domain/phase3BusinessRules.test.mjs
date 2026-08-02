import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { PayoutEngine } from "../../domain/chit/services/PayoutEngine.js";
import { BusinessHealthV2Engine } from "../../domain/chit/services/BusinessHealthV2Engine.js";
import { BatchRepository } from "../../repositories/BatchRepository.js";
import { calculateExpenseImpact } from "../../services/expenseService.js";
import { createMessageJob, previewMessage } from "../../services/communicationService.js";
import { buildPermissionMatrix, canPerform } from "../../services/permissionBuilderService.js";
import { formatMoney, t } from "../../services/localizationService.js";
import { savePaymentSettings, validatePaymentMode } from "../../services/paymentModeService.js";
import { confirmMonthClosing, previewMonthClosing, reopenMonth } from "../../services/monthClosingService.js";
import { confirmChitCompletion, previewChitCompletion } from "../../services/chitCompletionService.js";

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

describe("phase 3 final business rules", () => {
  const tenantA = { tenant_id: "tenant-a", data_scope: "scope-a" };
  const tenantB = { tenant_id: "tenant-b", data_scope: "scope-b" };

  beforeEach(() => {
    global.window = { localStorage: new MemoryLocalStorage() };
  });

  afterEach(() => {
    delete global.window;
  });

  it("keeps batch rows tenant isolated", () => {
    BatchRepository.save({ id: "batch-a", name: "Batch A", groupIds: ["g1"] }, tenantA);
    BatchRepository.save({ id: "batch-b", name: "Batch B", groupIds: ["g2"] }, tenantB);

    assert.deepEqual(BatchRepository.list(tenantA).map((row) => row.id), ["batch-a"]);
    assert.deepEqual(BatchRepository.list(tenantB).map((row) => row.id), ["batch-b"]);
  });

  it("supports payout installments, payment history and reversal reason", () => {
    const plan = PayoutEngine.createPlan({
      totalPayout: 90000,
      payoutMode: "INSTALLMENTS",
      installmentCount: 3,
      startDate: "2026-07-01",
    });
    const updated = PayoutEngine.applyPayment(plan, 30000);

    assert.equal(plan.installmentSchedule.length, 3);
    assert.equal(updated.pendingAmount, 60000);
    assert.equal(updated.status, "PARTIALLY_PAID");
    assert.throws(() => PayoutEngine.reverse(updated), /reason/i);
    assert.equal(PayoutEngine.reverse(updated, { reason: "Wrong winner" }).status, "CANCELLED");
  });

  it("includes expenses in net profit impact", () => {
    const impact = calculateExpenseImpact([{ amount: 500 }, { amount: 1250 }], 10000);

    assert.equal(impact.totalExpense, 1750);
    assert.equal(impact.netAfterExpense, 8250);
  });

  it("normalizes organizer payment modes and rejects disabled modes", () => {
    savePaymentSettings({ enabledModes: ["CASH", "UPI"], defaultMode: "UPI" }, tenantA);

    assert.equal(validatePaymentMode("upi", tenantA).isValid, true);
    assert.equal(validatePaymentMode("bank transfer", tenantA).isValid, false);
  });

  it("formats money and falls back translations by locale", () => {
    assert.match(formatMoney(100000, "en-IN"), /1,00,000|100,000/);
    assert.equal(t("dashboard", "xx-XX"), "Dashboard");
  });

  it("prevents duplicate communication jobs and keeps manual fallback explicit", () => {
    const first = createMessageJob({
      channel: "MANUAL_SHARE",
      dedupeKey: "receipt-1-whatsapp",
      body: previewMessage("Receipt {{number}} ready", { number: "R-1" }),
    }, tenantA);
    const duplicate = createMessageJob({
      channel: "MANUAL_SHARE",
      dedupeKey: "receipt-1-whatsapp",
      body: "Duplicate",
    }, tenantA);

    assert.equal(first.success, true);
    assert.equal(first.job.status, "MANUAL_ACTION_REQUIRED");
    assert.match(first.manualLink, /^https:\/\/wa.me/);
    assert.equal(duplicate.success, false);
  });

  it("enforces granular permission matrix decisions", () => {
    const matrix = buildPermissionMatrix(false);
    matrix.COLLECTIONS.CREATE = true;

    assert.equal(canPerform({ permissionMatrix: matrix }, "COLLECTIONS", "CREATE"), true);
    assert.equal(canPerform({ permissionMatrix: matrix }, "COLLECTIONS", "DELETE_OR_CANCEL"), false);
  });

  it("scores Business Health V2 from repository-shaped source data", () => {
    const health = BusinessHealthV2Engine.calculate({
      groups: [{ monthly_amount: 10000, total_members: 10 }],
      members: [{ id: "m1", status: "active" }, { id: "m2", status: "inactive" }],
      collections: [{ paid_amount: 50000, pending_amount: 5000 }],
      financeEntries: [{ cash_in: 50000, cash_out: 10000 }],
      expenses: [{ amount: 2500 }],
      payouts: [{ totalPayout: 90000, pendingAmount: 10000 }],
      reconciliation: { status: "PASS" },
    });

    assert.ok(health.overallScore > 0);
    assert.ok(health.metrics.some((metric) => metric.name === "Expense Control"));
  });

  it("requires organizer confirmation for month close and chit completion", async () => {
    const preview = previewMonthClosing({ groupId: "g1", monthNumber: 1, source: {} });
    const blocked = await confirmMonthClosing({ groupId: "g1", monthNumber: 1, source: {} }, tenantA);
    const closed = await confirmMonthClosing({ groupId: "g1", monthNumber: 1, source: {}, organizerConfirmed: true }, tenantA);
    const reopened = await reopenMonth(closed.snapshot, { reason: "Audit correction", hasPermission: true }, tenantA);

    assert.equal(preview.canClose, true);
    assert.equal(blocked.success, false);
    assert.equal(closed.success, true);
    assert.equal(reopened.snapshot.status, "REOPENED");

    const completePreview = previewChitCompletion({
      group: { id: "g1", total_months: 1 },
      monthClosings: [{ groupId: "g1", status: "CLOSED" }],
      payouts: [{ pendingAmount: 0 }],
      investorLedgers: [{ balance: 0 }],
    });
    const completed = await confirmChitCompletion({
      group: { id: "g1", total_months: 1 },
      monthClosings: [{ groupId: "g1", status: "CLOSED" }],
      payouts: [{ pendingAmount: 0 }],
      investorLedgers: [{ balance: 0 }],
      organizerConfirmed: true,
    }, tenantA);

    assert.equal(completePreview.canComplete, true);
    assert.equal(completed.success, true);
  });
});
