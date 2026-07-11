import test from "node:test";
import assert from "node:assert/strict";
import { CollectionEngine } from "../../domain/chit/services/CollectionEngine.js";
import { generateReceiptNumber } from "../../receipts/ReceiptNumberEngine.js";
import { ReportValidator } from "../../reports/ReportValidator.js";
import { ActiveSlotEngine } from "../../domain/chit/ActiveSlotEngine.js";

test("collection engine blocks duplicate settled installment and allows partial follow-up", () => {
  const base = {
    formData: {
      member_id: "member-1",
      chit_group_id: "group-1",
      installment_month: 1,
      payment_method: "Cash",
      paid_amount: 500,
    },
    member: { id: "member-1", status: "active" },
    group: { id: "group-1", status: "active", monthly_amount: 1000, total_months: 10 },
    receipts: [],
  };

  const partial = CollectionEngine.buildDraft({
    ...base,
    collections: [{ member_id: "member-1", group_id: "group-1", installment_month: 1, paid_amount: 500, pending_amount: 500 }],
  });
  const duplicateSettled = CollectionEngine.buildDraft({
    ...base,
    collections: [{ member_id: "member-1", group_id: "group-1", installment_month: 1, paid_amount: 1000, pending_amount: 0 }],
  });

  assert.equal(partial.validation.isValid, true);
  assert.equal(duplicateSettled.validation.isValid, false);
});

test("receipt number engine skips existing receipt numbers", () => {
  const date = new Date("2026-07-11T00:00:00.000Z");
  const receiptNumber = generateReceiptNumber([
    { receiptNumber: "MNCP-RCP-20260711-0001" },
    { receipt_number: "MNCP-RCP-20260711-0002" },
  ], date);

  assert.equal(receiptNumber, "MNCP-RCP-20260711-0003");
});

test("report validator detects duplicate receipt and finance reconciliation mismatch", () => {
  const result = ReportValidator.validate({
    reportId: "receipt-register",
    source: {
      groups: [{ id: "group-1" }],
      members: [{ id: "member-1" }],
      receipts: [{ receipt_number: "R-1" }],
      collections: [{ receipt_number: "R-1", paid_amount: 1000 }],
      financeEntries: [{ category: "Collection", amount: 900 }],
    },
    filters: { dateRange: { from: "2026-07-12", to: "2026-07-11" }, groupId: "group-1", memberId: "member-1" },
    rows: [{ id: "row-1", amount: 1000 }],
  });

  assert.equal(result.isValid, false);
  assert.ok(result.errors.includes("Invalid date range."));
  assert.ok(result.errors.includes("Duplicate receipt consistency issue."));
  assert.ok(result.warnings.includes("Collection total vs finance total mismatch."));
});

test("active slot engine releases slots after close or archive", () => {
  const state = ActiveSlotEngine.buildSlotState({
    maxActiveSlots: 1,
    groups: [
      { id: "active", status: "active" },
      { id: "closed", status: "closed" },
    ],
  });

  assert.equal(state.activeSlotsUsed, 1);
  assert.equal(state.reusableFromArchive, 1);
  assert.equal(state.canReuseActiveSlot, true);
});
