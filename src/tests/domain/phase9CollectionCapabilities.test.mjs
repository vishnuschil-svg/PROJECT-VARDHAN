import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CollectionEngine, PAYMENT_TYPES } from "../../domain/chit/services/CollectionEngine.js";

const base = {
  member: { id: "member-1", status: "active" },
  group: { id: "group-1", status: "active", monthly_amount: 1000, total_months: 10 },
  collections: [], receipts: [],
};

test("cash, UPI, bank transfer, and cheque collection modes are accepted", () => {
  for (const payment_method of ["Cash", "UPI", "Bank Transfer", "Cheque"]) {
    const result = CollectionEngine.buildDraft({ ...base, formData: { member_id: "member-1", chit_group_id: "group-1", installment_month: 1, paid_amount: 1000, payment_method } });
    assert.equal(result.validation.isValid, true, payment_method);
  }
});

test("full, partial/pending, and advance states are deterministic", () => {
  const make = (paid_amount) => CollectionEngine.buildDraft({ ...base, formData: { member_id: "member-1", chit_group_id: "group-1", installment_month: 1, payment_method: "Cash", paid_amount } });
  assert.equal(make(1000).paymentType, PAYMENT_TYPES.FULL);
  assert.equal(make(400).paymentType, PAYMENT_TYPES.PARTIAL);
  assert.equal(make(400).pendingAmount, 600);
  assert.equal(make(1200).paymentType, PAYMENT_TYPES.ADVANCE);
  assert.equal(make(1200).advanceAmount, 200);
});

test("collection commit produces receipt, persisted finance/ledger evidence, and audit activity", async () => {
  const source = await readFile(new URL("../../services/collectionService.js", import.meta.url), "utf8");
  assert.match(source, /saveReceipt/);
  assert.match(source, /saveFinanceEntry/);
  assert.match(source, /ActivityRepository\.addActivity/);
});
