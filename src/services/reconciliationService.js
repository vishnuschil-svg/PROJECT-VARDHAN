import { AuctionEngine } from "../domain/chit/services/AuctionEngine.js";

export const RECONCILIATION_STATUS = {
  PASS: "PASS",
  WARNING: "WARNING",
  FAIL: "FAIL",
};

export function runTrialReconciliation(source = {}) {
  return reconcileChitLifecycle(source);
}

export function reconcileChitLifecycle(source = {}) {
  const checks = [
    compareTotals({
      id: "collection_receipt_total",
      title: "Collection total = Receipt total",
      left: sum(source.collections, (row) => row.paid_amount || row.paidAmount),
      right: sum(source.receipts, (row) => row.amount || row.amountPaid),
    }),
    compareTotals({
      id: "collection_ledger_credit_total",
      title: "Collection total = Ledger credit total",
      left: sum(source.collections, (row) => row.paid_amount || row.paidAmount),
      right: sum(source.financeEntries, (row) => row.amount || row.credit || row.cash_in || row.bank_in),
    }),
    compareTotals({
      id: "cash_payments_cash_book",
      title: "Cash payments = Cash book entries",
      left: sum(filterPaymentMode(source.collections, ["cash"]), (row) => row.paid_amount || row.paidAmount),
      right: sum(source.financeEntries, (row) => row.cash_in),
    }),
    compareTotals({
      id: "bank_payments_bank_book",
      title: "Bank/UPI payments = Bank book entries",
      left: sum(filterPaymentMode(source.collections, ["upi", "bank", "bank transfer", "cheque", "online"]), (row) => row.paid_amount || row.paidAmount),
      right: sum(source.financeEntries, (row) => row.bank_in),
    }),
    compareTotals({
      id: "pending_member_balance",
      title: "Pending total = Member pending balances",
      left: calculateExpectedPending(source),
      right: sum(source.members, (row) => row.pending_amount || row.pendingAmount || row.outstanding_amount),
      allowWarningWhenRightEmpty: true,
    }),
    verifyAuctionRules(source),
    compareTotals({
      id: "dashboard_repository_total",
      title: "Dashboard totals = Repository totals",
      left: sum(source.groups, (row) => row.today_collections || row.todayCollections),
      right: sum(source.collections, (row) => row.paid_amount || row.paidAmount),
      allowWarningWhenRightEmpty: true,
    }),
    compareTotals({
      id: "report_repository_total",
      title: "Report totals = Repository totals",
      left: sum(source.savedReports || [], (row) => row.total_amount || row.totalAmount),
      right: sum(source.collections, (row) => row.paid_amount || row.paidAmount),
      allowWarningWhenLeftEmpty: true,
    }),
  ];

  const failed = checks.filter((check) => check.status === RECONCILIATION_STATUS.FAIL).length;
  const warnings = checks.filter((check) => check.status === RECONCILIATION_STATUS.WARNING).length;

  return {
    status: failed ? RECONCILIATION_STATUS.FAIL : warnings ? RECONCILIATION_STATUS.WARNING : RECONCILIATION_STATUS.PASS,
    passed: checks.filter((check) => check.status === RECONCILIATION_STATUS.PASS).length,
    warnings,
    failed,
    checks,
    generatedAt: new Date().toISOString(),
  };
}

function compareTotals({
  id,
  title,
  left,
  right,
  allowWarningWhenLeftEmpty = false,
  allowWarningWhenRightEmpty = false,
}) {
  const leftTotal = roundMoney(left);
  const rightTotal = roundMoney(right);
  const difference = roundMoney(leftTotal - rightTotal);
  const leftEmptyWarning = allowWarningWhenLeftEmpty && leftTotal === 0 && rightTotal > 0;
  const rightEmptyWarning = allowWarningWhenRightEmpty && rightTotal === 0 && leftTotal > 0;

  if (leftEmptyWarning || rightEmptyWarning) {
    return {
      id,
      title,
      status: RECONCILIATION_STATUS.WARNING,
      expected: leftTotal,
      actual: rightTotal,
      difference,
      message: "Source exists, but comparison data is not fully available yet.",
    };
  }

  return {
    id,
    title,
    status: Math.abs(difference) < 0.01 ? RECONCILIATION_STATUS.PASS : RECONCILIATION_STATUS.FAIL,
    expected: leftTotal,
    actual: rightTotal,
    difference,
    message: Math.abs(difference) < 0.01 ? "Matched." : "Mismatch detected.",
  };
}

function verifyAuctionRules(source) {
  const group = source.groups?.[0] || {};
  const auction = source.auctions?.find((item) => item.winner_member_id || item.winnerMemberId) || source.auctions?.[0];

  if (!auction) {
    return {
      id: "auction_values",
      title: "Auction values = Prize + Commission + Dividend rules",
      status: RECONCILIATION_STATUS.WARNING,
      expected: 0,
      actual: 0,
      difference: 0,
      message: "Auction not recorded yet.",
    };
  }

  const calculated = AuctionEngine.calculateAuction({
    group,
    auction,
    commissionRate: Number(auction.commission_rate || auction.commissionRate || group.commission_rate || 5),
  });
  const storedPrize = Number(auction.prize_amount || auction.prizeAmount || calculated.prizeAmount);
  const storedCommission = Number(auction.commission_amount || auction.commission || calculated.commission);
  const storedDividend = Number(auction.dividend_amount || auction.dividend || calculated.dividend);
  const expected = roundMoney(calculated.prizeAmount + calculated.commission + calculated.dividend);
  const actual = roundMoney(storedPrize + storedCommission + storedDividend);
  const difference = roundMoney(expected - actual);

  return {
    id: "auction_values",
    title: "Auction values = Prize + Commission + Dividend rules",
    status: Math.abs(difference) < 0.01 ? RECONCILIATION_STATUS.PASS : RECONCILIATION_STATUS.FAIL,
    expected,
    actual,
    difference,
    message: Math.abs(difference) < 0.01 ? "Auction values matched." : "Auction calculation mismatch detected.",
  };
}

function filterPaymentMode(rows = [], modes = []) {
  const normalizedModes = modes.map((mode) => mode.toLowerCase());

  return rows.filter((row) =>
    normalizedModes.some((mode) => String(row.payment_method || row.paymentMode || "").toLowerCase().includes(mode))
  );
}

function sum(rows = [], getter) {
  return rows.reduce((total, row) => total + Number(getter(row) || 0), 0);
}

function calculateExpectedPending(source) {
  const group = source.groups?.[0] || {};
  const monthlyAmount = Number(group.monthly_amount || group.monthlyAmount || 0);
  const currentMonth = 1;
  const paidMemberIds = new Set(
    (source.collections || [])
      .filter((row) => Number(row.installment_month || row.installmentNumber || 1) === currentMonth)
      .map((row) => row.member_id || row.memberId)
      .filter(Boolean)
  );
  const uncollectedMembers = (source.members || []).filter((member) => !paidMemberIds.has(member.id));

  return sum(source.collections, (row) => row.pending_amount || row.pendingAmount) +
    uncollectedMembers.length * monthlyAmount;
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}
