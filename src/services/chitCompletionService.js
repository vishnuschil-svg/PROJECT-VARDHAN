import { ChitCompletionRepository } from "../repositories/ChitCompletionRepository.js";

export function previewChitCompletion({ group = {}, monthClosings = [], payouts = [], investorLedgers = [], reconciliation } = {}) {
  const totalMonths = Number(group.total_months || group.totalMonths || 0);
  const closedMonths = monthClosings.filter((row) => row.groupId === group.id && row.status === "CLOSED").length;
  const pendingPayout = payouts.reduce((total, row) => total + Number(row.pendingAmount || 0), 0);
  const investorBalance = investorLedgers.reduce((total, row) => total + Number(row.balance || 0), 0);
  const issues = [];
  if (closedMonths < totalMonths) issues.push("All months must be closed.");
  if (pendingPayout > 0) issues.push("Pending payout remains.");
  if (investorBalance !== 0) issues.push("Investor settlement pending.");
  if (reconciliation?.status === "FAIL") issues.push("Reconciliation failed.");
  return {
    groupId: group.id,
    closedMonths,
    totalMonths,
    pendingPayout,
    investorBalance,
    issues,
    canComplete: issues.length === 0,
  };
}

export function confirmChitCompletion(input, activeTenantContext) {
  const preview = previewChitCompletion(input);
  if (!input.organizerConfirmed) return { success: false, preview, message: "Organizer confirmation is mandatory." };
  if (!preview.canComplete) return { success: false, preview, message: preview.issues[0] };
  return { success: true, snapshot: ChitCompletionRepository.save({ ...preview, status: "COMPLETED", completedAt: new Date().toISOString() }, activeTenantContext) };
}
