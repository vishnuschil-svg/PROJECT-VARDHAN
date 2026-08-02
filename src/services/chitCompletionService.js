import {
  confirmChitCompletionPersistent,
  listCompletionsPersistent,
} from "./closingLifecyclePersistence.js";
import { ActiveSlotEngine } from "../domain/chit/ActiveSlotEngine.js";

export function previewChitCompletion({
  group = {},
  monthClosings = [],
  payouts = [],
  investorLedgers = [],
  winners,
  collections,
  expenses = [],
  dividends = [],
  reconciliation,
} = {}) {
  const totalMonths = Number(group.total_months || group.totalMonths || 0);
  const closedMonths = monthClosings.filter(
    (row) =>
      (row.groupId || row.group_id) === group.id && String(row.status || "").toUpperCase() === "CLOSED"
  ).length;
  const pendingPayout = payouts.reduce((total, row) => total + Number(row.pendingAmount || 0), 0);
  const investorBalance = investorLedgers.reduce((total, row) => total + Number(row.balance || 0), 0);
  const collectionRows = Array.isArray(collections) ? collections : [];
  const winnerRows = Array.isArray(winners) ? winners : [];
  const pendingCollections = collectionRows.reduce(
    (total, row) => total + Number(row.pending_amount || row.pendingAmount || 0),
    0
  );
  const confirmedWinners = winnerRows.filter(
    (row) =>
      (row.groupId || row.group_id) === group.id &&
      ["CONFIRMED", "PAID", "SETTLED"].includes(String(row.status || "").toUpperCase())
  ).length;
  const expenseTotal = expenses.reduce((total, row) => total + Number(row.amount || 0), 0);
  const dividendTotal = dividends.reduce(
    (total, row) => total + Number(row.amount || row.dividend_amount || 0),
    0
  );

  const issues = [];
  if (closedMonths < totalMonths) issues.push("All months must be closed.");
  if (pendingPayout > 0) issues.push("Pending payout remains.");
  if (investorBalance !== 0) issues.push("Investor settlement pending.");
  if (Array.isArray(collections) && pendingCollections > 0) {
    issues.push("Pending collections must be resolved or explicitly written off.");
  }
  if (Array.isArray(winners) && totalMonths > 0 && confirmedWinners < totalMonths) {
    issues.push("All winners must be finalized.");
  }
  if (reconciliation?.status === "FAIL") issues.push("Reconciliation failed.");

  return {
    groupId: group.id,
    closedMonths,
    totalMonths,
    pendingPayout,
    investorBalance,
    pendingCollections,
    confirmedWinners,
    expenseTotal,
    dividendTotal,
    memberFinalBalances: investorLedgers,
    exportReady: issues.length === 0,
    issues,
    canComplete: issues.length === 0,
  };
}

export async function confirmChitCompletion(input, activeTenantContext) {
  const preview = previewChitCompletion(input);
  if (!input.organizerConfirmed) {
    return { success: false, preview, message: "Organizer confirmation is mandatory." };
  }
  if (!preview.canComplete) {
    return { success: false, preview, message: preview.issues[0] };
  }

  try {
    const result = await confirmChitCompletionPersistent(
      { ...input, preview, snapshot: preview },
      activeTenantContext
    );
    if (!result.success) {
      return { success: false, preview, message: result.message || "Chit completion failed." };
    }
    return { success: true, preview, snapshot: result.snapshot, idempotent: result.idempotent };
  } catch (error) {
    return { success: false, preview, message: error.message || "Chit completion failed." };
  }
}

export async function listCompletions(activeTenantContext) {
  return listCompletionsPersistent(activeTenantContext);
}

export function activeSlotImpactAfterCompletion(groups = [], maxActiveSlots = 10) {
  return ActiveSlotEngine.buildSlotState({ groups, maxActiveSlots });
}
