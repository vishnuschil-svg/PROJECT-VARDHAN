import { countActiveChits } from "../config/chitTrialPlans.js";
import { formatINR } from "../utils/chitDisplayFormat.js";

/**
 * Build Groups page summary from persisted tenant records only.
 * Missing inputs render as null (UI shows "—"), never fabricated.
 */
export function buildChitGroupsSummary({
  groups = [],
  collections = [],
} = {}) {
  const activeGroups = groups.filter((group) => {
    const status = String(group.status || "").toLowerCase();
    return status === "active" || status === "upcoming";
  });

  const totalActiveGroups = activeGroups.length;

  const portfolioValues = activeGroups
    .map((group) => Number(group.chit_value ?? group.chitValue))
    .filter((value) => Number.isFinite(value) && value > 0);
  const totalPortfolioValue =
    portfolioValues.length > 0 ? portfolioValues.reduce((sum, value) => sum + value, 0) : null;

  const targets = activeGroups
    .map((group) => {
      const monthly = Number(group.monthly_amount ?? group.monthlyAmount);
      const members = Number(group.total_members ?? group.totalMembers);
      if (!Number.isFinite(monthly) || monthly <= 0) return null;
      if (!Number.isFinite(members) || members <= 0) return null;
      return monthly * members;
    })
    .filter((value) => value != null);
  const thisMonthCollectionTarget =
    targets.length > 0 ? targets.reduce((sum, value) => sum + value, 0) : null;

  let pendingPaymentAmount = null;
  if (Array.isArray(collections) && collections.length > 0) {
    pendingPaymentAmount = collections.reduce(
      (sum, row) => sum + Math.max(0, Number(row.pending_amount ?? row.pendingAmount ?? 0)),
      0
    );
  } else {
    const outstanding = activeGroups
      .map((group) => Number(group.pending_collections ?? group.outstanding_amount))
      .filter((value) => Number.isFinite(value));
    pendingPaymentAmount = outstanding.length > 0 ? outstanding.reduce((sum, value) => sum + value, 0) : null;
  }

  return {
    totalActiveGroups,
    totalPortfolioValue,
    thisMonthCollectionTarget,
    pendingPaymentAmount,
    activeSlotCount: countActiveChits(groups),
    cards: [
      {
        key: "active",
        label: "Total Active Groups",
        value: totalActiveGroups,
        display: String(totalActiveGroups),
      },
      {
        key: "portfolio",
        label: "Total Portfolio Value",
        value: totalPortfolioValue,
        display: totalPortfolioValue == null ? "—" : formatINR(totalPortfolioValue),
      },
      {
        key: "target",
        label: "This Month Collection Target",
        value: thisMonthCollectionTarget,
        display: thisMonthCollectionTarget == null ? "—" : formatINR(thisMonthCollectionTarget),
      },
      {
        key: "pending",
        label: "Pending Payment Amount",
        value: pendingPaymentAmount,
        display: pendingPaymentAmount == null ? "—" : formatINR(pendingPaymentAmount),
      },
    ],
  };
}
