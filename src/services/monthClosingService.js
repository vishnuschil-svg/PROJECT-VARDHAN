import { runTrialReconciliation } from "./reconciliationService.js";
import {
  confirmMonthClosingPersistent,
  listMonthClosingsPersistent,
  reopenMonthClosingPersistent,
} from "./closingLifecyclePersistence.js";

export function previewMonthClosing({
  source = {},
  groupId,
  monthNumber,
  expenses = [],
  payouts = [],
  investors = [],
  dividends = [],
  winners,
  ledgers = [],
  financeEntries = [],
  enforcePending = false,
} = {}) {
  const reconciliation = runTrialReconciliation(source);
  const winnerRows = Array.isArray(winners) ? winners : [];
  const summary = {
    groupId,
    monthNumber,
    collectionTotal: sum(source.collections, "paid_amount"),
    pending: sum(source.collections, "pending_amount"),
    payoutPaid: sum(payouts, "paidAmount"),
    payoutPending: sum(payouts, "pendingAmount"),
    expenses: sum(expenses, "amount"),
    commission: sum(source.auctions, "commission_amount"),
    dividend: sum(dividends.length ? dividends : source.auctions, dividends.length ? "amount" : "dividend_amount"),
    investorBalance: investors.reduce((total, row) => total + Number(row.balance || 0), 0),
    winnerCount: winnerRows.filter(
      (row) =>
        (row.groupId || row.group_id) === groupId &&
        Number(row.monthNumber || row.month_number) === Number(monthNumber) &&
        String(row.status || "").toUpperCase() !== "CANCELLED"
    ).length,
    ledgerBalance: (ledgers || []).reduce((total, row) => total + Number(row.amount || row.balance || 0), 0),
    financeBalance:
      sum(financeEntries, "cash_in") +
      sum(financeEntries, "bank_in") -
      sum(financeEntries, "cash_out") -
      sum(financeEntries, "bank_out"),
    reconciliationStatus: reconciliation.status,
  };

  const issues = [];
  if (reconciliation.status === "FAIL") issues.push("Reconciliation must pass before close.");
  if (summary.payoutPending > 0) issues.push("Unresolved pending payouts remain.");
  if ((enforcePending || summary.pending > 0) && summary.pending > 0) {
    issues.push("Unresolved pending collections remain.");
  }
  if (Array.isArray(winners) && summary.winnerCount < 1 && Number(monthNumber || 0) > 0) {
    issues.push("Winner must be finalized before month close.");
  }

  return { summary, reconciliation, issues, canClose: issues.length === 0 };
}

export async function confirmMonthClosing(input, activeTenantContext) {
  const preview = previewMonthClosing(input);
  if (!input.organizerConfirmed) {
    return { success: false, preview, message: "Organizer confirmation is mandatory." };
  }
  if (!preview.canClose) {
    return { success: false, preview, message: preview.issues[0] };
  }

  try {
    const result = await confirmMonthClosingPersistent(
      { ...input, summary: preview.summary, preview },
      activeTenantContext
    );
    if (!result.success) {
      return { success: false, preview, message: result.message || "Month closing failed." };
    }
    return { success: true, preview, snapshot: result.snapshot, idempotent: result.idempotent };
  } catch (error) {
    return { success: false, preview, message: error.message || "Month closing failed." };
  }
}

export async function reopenMonth(snapshot, options = {}, activeTenantContext) {
  return reopenMonthClosingPersistent(snapshot, options, activeTenantContext);
}

export async function listMonthClosings(activeTenantContext) {
  return listMonthClosingsPersistent(activeTenantContext);
}

function sum(rows = [], field) {
  return rows.reduce((total, row) => total + Number(row[field] || 0), 0);
}
