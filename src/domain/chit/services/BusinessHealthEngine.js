import { MemberStatus, isActiveMemberStatus } from "../valueObjects/MemberStatus.js";
import { ChitCalculationEngine } from "./ChitCalculationEngine.js";

const STATUS = {
  EXCELLENT: "Excellent",
  HEALTHY: "Healthy",
  ATTENTION: "Attention",
  CRITICAL: "Critical",
};

export const BusinessHealthEngine = {
  buildHealth(snapshot = {}) {
    const metrics = this.buildMetrics(snapshot);
    const factorScores = buildFactorScores(metrics);
    const score = weightedScore(factorScores);
    const status = getStatus(score);

    return {
      score,
      status,
      collectionRate: metrics.collectionRate,
      pendingRate: metrics.pendingRate,
      cashFlow: metrics.cashFlow,
      profitTrend: metrics.profitTrend,
      aiSuggestion: getAiSuggestion({ status, metrics }),
      metrics,
      factorScores,
    };
  },

  buildMetrics({ groups = [], members = [], collections = [], financeEntries = [] } = {}) {
    const activeGroups = groups.filter((group) => String(group.status || "").toLowerCase() === "active");
    const activeMembers = members.filter((member) => isActiveMemberStatus(member.status || MemberStatus.ACTIVE));
    const monthlyCollection = activeGroups.reduce(
      (total, group) => total + Number(group.monthly_amount || group.monthlyAmount || 0) * Number(group.total_members || group.totalMembers || 0),
      0
    );
    const todayKey = new Date().toISOString().slice(0, 10);
    const currentMonthKey = todayKey.slice(0, 7);
    const previousMonthKey = getPreviousMonthKey(todayKey);
    const currentMonthCollections = filterCollectionsByMonth(collections, currentMonthKey);
    const previousMonthCollections = filterCollectionsByMonth(collections, previousMonthKey);
    const collectionTotal = sumCollectionPaid(currentMonthCollections);
    const groupCollectionEstimate = Math.max(
      monthlyCollection - groups.reduce((sum, group) => sum + Number(group.pending_collections || group.pendingCollections || 0), 0),
      0
    );
    const collectedAmount = currentMonthCollections.length ? collectionTotal : groupCollectionEstimate;
    const todayCollection = collections.length
      ? sumCollectionPaid(collections.filter((collection) => getRecordDate(collection) === todayKey))
      : groups.reduce((sum, group) => sum + Number(group.today_collections || group.todayCollections || 0), 0);
    const pendingAmount = collections.length
      ? collections.reduce((sum, collection) => sum + Number(collection.pending_amount || collection.pendingAmount || 0), 0)
      : groups.reduce((sum, group) => sum + Number(group.pending_collections || group.pendingCollections || 0), 0);
    const financeIncome = financeEntries
      .filter((entry) => isIncomeEntry(entry))
      .reduce((sum, entry) => sum + Number(entry.amount || entry.cash_in || entry.bank_in || 0), 0);
    const financeExpense = financeEntries
      .filter((entry) => isExpenseEntry(entry))
      .reduce((sum, entry) => sum + Number(entry.amount || entry.cash_out || entry.bank_out || 0), 0);
    const cashFlow = collectedAmount + financeIncome - financeExpense;
    const profitTrend = cashFlow - pendingAmount;
    const previousCollected = sumCollectionPaid(previousMonthCollections);

    return {
      activeGroups: activeGroups.length,
      activeMembers: activeMembers.length,
      todayCollection,
      monthlyCollection,
      pendingAmount,
      collectionRate: ChitCalculationEngine.toPercent(collectedAmount, monthlyCollection),
      pendingRate: ChitCalculationEngine.toPercent(pendingAmount, monthlyCollection),
      cashFlow,
      profitTrend,
      overdueMembers: getOverdueMembers(collections),
      monthlyGrowth: getMonthlyGrowth(collectedAmount, previousCollected),
    };
  },
};

function buildFactorScores(metrics) {
  const overdueRate = ChitCalculationEngine.toPercent(metrics.overdueMembers, metrics.activeMembers);

  return {
    collectionEfficiency: clamp(metrics.collectionRate),
    pending: clamp(100 - metrics.pendingRate),
    cashFlow: clamp(ChitCalculationEngine.toPercent(Math.max(metrics.cashFlow, 0), Math.max(metrics.monthlyCollection, 1))),
    activeGroups: metrics.activeGroups > 0 ? 100 : 0,
    overdueMembers: clamp(100 - overdueRate),
    monthlyGrowth: getGrowthScore(metrics.monthlyGrowth),
  };
}

function weightedScore(factors) {
  return Math.round(
    factors.collectionEfficiency * 0.28 +
      factors.pending * 0.2 +
      factors.cashFlow * 0.18 +
      factors.activeGroups * 0.12 +
      factors.overdueMembers * 0.12 +
      factors.monthlyGrowth * 0.1
  );
}

function getStatus(score) {
  if (score >= 85) return STATUS.EXCELLENT;
  if (score >= 70) return STATUS.HEALTHY;
  if (score >= 50) return STATUS.ATTENTION;
  return STATUS.CRITICAL;
}

function getAiSuggestion({ status, metrics }) {
  if (metrics.pendingRate >= 25) {
    return "Prioritize pending collection follow-ups before opening new growth commitments.";
  }
  if (metrics.cashFlow < 0) {
    return "Review expense outflow and protect short-term liquidity before the next auction cycle.";
  }
  if (metrics.overdueMembers > 0) {
    return "Assign overdue members to a focused reminder queue and track recovery daily.";
  }
  if (status === STATUS.EXCELLENT || status === STATUS.HEALTHY) {
    return "Collection health is stable; continue monitoring pending rate and member payment rhythm.";
  }
  return "Improve collection efficiency and reduce pending exposure to lift the business health score.";
}

function filterCollectionsByMonth(collections, monthKey) {
  return collections.filter((collection) => getRecordDate(collection).startsWith(monthKey));
}

function sumCollectionPaid(collections) {
  return collections.reduce((sum, collection) => sum + Number(collection.paid_amount || collection.paidAmount || 0), 0);
}

function getRecordDate(record) {
  return String(record.payment_date || record.paymentDate || record.date || record.created_at || "").slice(0, 10);
}

function getOverdueMembers(collections) {
  return new Set(
    collections
      .filter((collection) => Number(collection.pending_amount || collection.pendingAmount || 0) > 0)
      .map((collection) => collection.member_id || collection.memberId)
      .filter(Boolean)
  ).size;
}

function getMonthlyGrowth(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function getGrowthScore(growth) {
  if (growth >= 30) return 100;
  if (growth >= 0) return 70 + growth;
  return clamp(70 + growth);
}

function getPreviousMonthKey(dateKey) {
  const date = new Date(`${dateKey.slice(0, 7)}-01T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 7);
}

function isIncomeEntry(entry) {
  return ["income", "credit", "receipt"].includes(String(entry.type || "").toLowerCase())
    || Number(entry.cash_in || entry.bank_in || 0) > 0;
}

function isExpenseEntry(entry) {
  return ["expense", "debit", "payment"].includes(String(entry.type || "").toLowerCase())
    || Number(entry.cash_out || entry.bank_out || 0) > 0;
}

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value || 0))));
}
