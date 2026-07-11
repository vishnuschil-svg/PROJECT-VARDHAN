import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { reconcileChitLifecycle } from "../../services/reconciliationService.js";

describe("real trial run reconciliation", () => {
  it("passes matched collection, receipt, ledger, finance, pending, auction, dashboard, and report totals", () => {
    const source = buildMatchedTrialSource();
    const result = reconcileChitLifecycle(source);

    assert.equal(result.status, "PASS");
    assert.equal(result.failed, 0);
    assert.equal(result.checks.every((check) => check.status === "PASS"), true);
  });

  it("fails visibly when receipt totals do not match collections", () => {
    const source = buildMatchedTrialSource();
    source.receipts[0].amount = 9000;
    const result = reconcileChitLifecycle(source);
    const receiptCheck = result.checks.find((check) => check.id === "collection_receipt_total");

    assert.equal(result.status, "FAIL");
    assert.equal(receiptCheck.status, "FAIL");
  });

});

function buildMatchedTrialSource() {
  return {
    groups: [
      {
        id: "group-1",
        chit_value: 100000,
        monthly_amount: 10000,
        total_members: 2,
        today_collections: 14000,
        commission_rate: 5,
      },
    ],
    members: [
      { id: "member-1", group_id: "group-1", pending_amount: 0 },
      { id: "member-2", group_id: "group-1", pending_amount: 6000 },
    ],
    collections: [
      {
        id: "collection-1",
        group_id: "group-1",
        member_id: "member-1",
        installment_month: 1,
        paid_amount: 10000,
        pending_amount: 0,
        payment_method: "Cash",
      },
      {
        id: "collection-2",
        group_id: "group-1",
        member_id: "member-2",
        installment_month: 1,
        paid_amount: 4000,
        pending_amount: 6000,
        payment_method: "UPI",
      },
    ],
    receipts: [
      { id: "receipt-1", group_id: "group-1", collection_id: "collection-1", amount: 10000 },
      { id: "receipt-2", group_id: "group-1", collection_id: "collection-2", amount: 4000 },
    ],
    financeEntries: [
      { id: "finance-1", receipt_no: "R1", amount: 10000, cash_in: 10000, bank_in: 0 },
      { id: "finance-2", receipt_no: "R2", amount: 4000, cash_in: 0, bank_in: 4000 },
    ],
    auctions: [
      {
        id: "auction-1",
        group_id: "group-1",
        auction_month: 1,
        bid_amount: 20000,
        prize_amount: 15000,
        discount_amount: 80000,
        dividend_amount: 37500,
        commission_amount: 5000,
        winner_member_id: "member-1",
      },
    ],
    savedReports: [
      { id: "report-1", total_amount: 10000 },
      { id: "report-2", total_amount: 4000 },
    ],
  };
}
