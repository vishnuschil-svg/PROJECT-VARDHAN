import test from "node:test";
import assert from "node:assert/strict";
import { buildMemberLedger } from "../../config/chitMemberLedger.js";

test("member ledger never fabricates paid transactions without collection evidence", () => {
  const ledger = buildMemberLedger({
    member: { id: "member-001", status: "active", member_name: "Trial Member" },
    group: {
      id: "group-1",
      chit_code: "TRIAL",
      monthly_amount: 10000,
      total_months: 12,
      start_date: "2026-07-01",
    },
    collections: [],
  });

  assert.equal(ledger.total_installments_paid, 0);
  assert.equal(ledger.fine, 0);
  assert.equal(ledger.discount, 0);
  assert.equal(ledger.dividend_received, 0);
  assert.equal(ledger.lift_amount, 0);
  assert.deepEqual(ledger.transactions, []);
  assert.equal(ledger.timeline.some((item) => item.title === "Installment collected"), false);
});
