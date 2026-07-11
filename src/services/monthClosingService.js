import { MonthClosingRepository } from "../repositories/MonthClosingRepository.js";
import { runTrialReconciliation } from "./reconciliationService.js";

export function previewMonthClosing({ source = {}, groupId, monthNumber, expenses = [], payouts = [], investors = [] } = {}) {
  const reconciliation = runTrialReconciliation(source);
  const summary = {
    groupId,
    monthNumber,
    collectionTotal: sum(source.collections, "paid_amount"),
    pending: sum(source.collections, "pending_amount"),
    payoutPaid: sum(payouts, "paidAmount"),
    payoutPending: sum(payouts, "pendingAmount"),
    expenses: sum(expenses, "amount"),
    commission: sum(source.auctions, "commission_amount"),
    dividend: sum(source.auctions, "dividend_amount"),
    investorBalance: investors.reduce((total, row) => total + Number(row.balance || 0), 0),
    reconciliationStatus: reconciliation.status,
  };
  const issues = reconciliation.status === "FAIL" ? ["Reconciliation must pass before close."] : [];
  return { summary, reconciliation, issues, canClose: issues.length === 0 };
}

export function confirmMonthClosing(input, activeTenantContext) {
  const preview = previewMonthClosing(input);
  if (!input.organizerConfirmed) return { success: false, preview, message: "Organizer confirmation is mandatory." };
  if (!preview.canClose) return { success: false, preview, message: preview.issues[0] };
  return { success: true, snapshot: MonthClosingRepository.save({ ...preview.summary, status: "CLOSED", confirmedAt: new Date().toISOString() }, activeTenantContext) };
}

export function reopenMonth(snapshot, { reason, hasPermission } = {}, activeTenantContext) {
  if (!hasPermission) return { success: false, message: "Reopen permission is required." };
  if (!reason) return { success: false, message: "Reopen reason is required." };
  return { success: true, snapshot: MonthClosingRepository.save({ ...snapshot, status: "REOPENED", reopenReason: reason, reopenedAt: new Date().toISOString() }, activeTenantContext) };
}

function sum(rows = [], field) {
  return rows.reduce((total, row) => total + Number(row[field] || 0), 0);
}
