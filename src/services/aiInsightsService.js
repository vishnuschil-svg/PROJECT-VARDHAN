import { AIInsightsRepository } from "../repositories/AIInsightsRepository.js";
import { getBusinessHealth } from "./businessHealthService.js";

export const AI_INSIGHT_TYPES = {
  COLLECTION_GROWTH: "COLLECTION_GROWTH",
  PENDING_RISK: "PENDING_RISK",
  OVERDUE_MEMBERS: "OVERDUE_MEMBERS",
  PROFIT_TREND: "PROFIT_TREND",
  AUCTION_REMINDER: "AUCTION_REMINDER",
  DATA_QUALITY: "DATA_QUALITY",
  BUSINESS_HEALTH: "BUSINESS_HEALTH",
};

const ROUTES = {
  COLLECTIONS: "/chits/collections",
  PENDING: "/chits/collections/pending",
  MEMBERS: "/chits/members",
  FINANCE: "/chits/finance",
  AUCTIONS: "/chits/auctions",
  REPORTS: "/chits/reports",
  SETTINGS: "/chits/settings",
};

export function getAIInsights(activeTenantContext) {
  const snapshot = AIInsightsRepository.getSnapshot(activeTenantContext);
  if (!hasBusinessData(snapshot)) {
    return [];
  }
  const health = getBusinessHealth(activeTenantContext);
  const metrics = buildInsightMetrics(snapshot, health);

  return [
    buildCollectionGrowthInsight(metrics),
    buildPendingRiskInsight(metrics),
    buildOverdueMembersInsight(metrics),
    buildProfitTrendInsight(metrics),
    buildAuctionReminderInsight(metrics),
    buildDataQualityInsight(metrics),
    buildBusinessHealthInsight(metrics),
  ].sort(sortByPriority);
}

function hasBusinessData({ groups = [], members = [], collections = [], financeEntries = [] } = {}) {
  return groups.length > 0 || members.length > 0 || collections.length > 0 || financeEntries.length > 0;
}

function buildInsightMetrics({ groups = [], members = [], collections = [], financeEntries = [] }, health) {
  const activeGroups = groups.filter((group) => isStatus(group.status, "ACTIVE"));
  const activeMembers = members.filter((member) => isStatus(member.status, "ACTIVE"));
  const today = new Date().toISOString().slice(0, 10);
  const upcomingAuctions = groups
    .filter((group) =>
      group.next_auction_date &&
      group.next_auction_date >= today &&
      !isStatus(group.status, "CLOSED") &&
      !isStatus(group.status, "ARCHIVED")
    )
    .sort((a, b) => String(a.next_auction_date).localeCompare(String(b.next_auction_date)));
  const pendingAmount = collections.length
    ? collections.reduce((sum, collection) => sum + Number(collection.pending_amount || 0), 0)
    : groups.reduce((sum, group) => sum + Number(group.pending_collections || 0), 0);
  const monthlyTarget = activeGroups.reduce(
    (sum, group) => sum + Number(group.monthly_amount || 0) * Number(group.total_members || 0),
    0
  );
  const overdueMemberIds = getOverdueMemberIds(collections);
  const incompleteMemberCount = activeMembers.filter((member) =>
    !member.whatsapp_number || !member.email || !member.pan || !member.aadhaar_masked
  ).length;
  const financeEntryCount = financeEntries.length;

  return {
    health,
    activeGroups: activeGroups.length,
    activeMembers: activeMembers.length,
    collectionRate: health.collectionRate,
    pendingRate: health.pendingRate,
    pendingAmount,
    monthlyTarget,
    overdueMembers: overdueMemberIds.length,
    incompleteMemberCount,
    financeEntryCount,
    nextAuction: upcomingAuctions[0] || null,
    upcomingAuctionCount: upcomingAuctions.length,
  };
}

function isStatus(value, status) {
  return String(value || "").toUpperCase() === String(status || "").toUpperCase();
}

function buildCollectionGrowthInsight(metrics) {
  const strongCollection = metrics.collectionRate >= 85;

  return {
    id: "collection-growth",
    type: AI_INSIGHT_TYPES.COLLECTION_GROWTH,
    title: strongCollection ? "Collections are compounding well" : "Collection growth needs attention",
    message: strongCollection
      ? `Collection efficiency is at ${metrics.collectionRate}%, giving the business room to plan the next growth push.`
      : `Collection efficiency is ${metrics.collectionRate}%; review collection rhythm before expanding active commitments.`,
    priority: strongCollection ? "medium" : "high",
    actionLabel: "Open collections",
    actionRoute: ROUTES.COLLECTIONS,
  };
}

function buildPendingRiskInsight(metrics) {
  const priority = metrics.pendingRate >= 25 ? "critical" : metrics.pendingRate >= 12 ? "high" : "medium";

  return {
    id: "pending-risk",
    type: AI_INSIGHT_TYPES.PENDING_RISK,
    title: priority === "critical" ? "Pending exposure is high" : "Pending collections under watch",
    message: `${formatCurrency(metrics.pendingAmount)} is pending, equal to ${metrics.pendingRate}% of the current monthly target.`,
    priority,
    actionLabel: "Review pending",
    actionRoute: ROUTES.PENDING,
  };
}

function buildOverdueMembersInsight(metrics) {
  const hasOverdueMembers = metrics.overdueMembers > 0;

  return {
    id: "overdue-members",
    type: AI_INSIGHT_TYPES.OVERDUE_MEMBERS,
    title: hasOverdueMembers ? "Overdue member follow-up required" : "No overdue member concentration",
    message: hasOverdueMembers
      ? `${metrics.overdueMembers} member accounts have pending balances and should be queued for follow-up.`
      : "Member payment status is clean from the available collection records.",
    priority: hasOverdueMembers ? "high" : "low",
    actionLabel: "Open members",
    actionRoute: ROUTES.MEMBERS,
  };
}

function buildProfitTrendInsight(metrics) {
  const positiveTrend = metrics.health.profitTrend >= 0;

  return {
    id: "profit-trend",
    type: AI_INSIGHT_TYPES.PROFIT_TREND,
    title: positiveTrend ? "Profit trend is positive" : "Profit trend is compressed",
    message: `Current profit trend is ${formatCurrency(metrics.health.profitTrend)} after pending exposure and cash flow movement.`,
    priority: positiveTrend ? "medium" : "high",
    actionLabel: "Open finance",
    actionRoute: ROUTES.FINANCE,
  };
}

function buildAuctionReminderInsight(metrics) {
  if (!metrics.nextAuction) {
    return {
      id: "auction-reminder",
      type: AI_INSIGHT_TYPES.AUCTION_REMINDER,
      title: "No upcoming auction scheduled",
      message: "No active auction date is visible in the current chit group records.",
      priority: "low",
      actionLabel: "Open auctions",
      actionRoute: ROUTES.AUCTIONS,
    };
  }

  return {
    id: "auction-reminder",
    type: AI_INSIGHT_TYPES.AUCTION_REMINDER,
    title: "Upcoming auction reminder",
    message: `${metrics.nextAuction.chit_name || metrics.nextAuction.chit_code} is scheduled on ${metrics.nextAuction.next_auction_date}.`,
    priority: "medium",
    actionLabel: "Prepare auction",
    actionRoute: ROUTES.AUCTIONS,
  };
}

function buildDataQualityInsight(metrics) {
  const hasGaps = metrics.incompleteMemberCount > 0 || metrics.financeEntryCount === 0;

  return {
    id: "data-quality",
    type: AI_INSIGHT_TYPES.DATA_QUALITY,
    title: hasGaps ? "Data quality gaps detected" : "Data quality is ready",
    message: hasGaps
      ? `${metrics.incompleteMemberCount} member profiles need stronger contact or KYC data; finance entries available: ${metrics.financeEntryCount}.`
      : "Member profile and finance records are sufficiently complete for dashboard intelligence.",
    priority: hasGaps ? "medium" : "low",
    actionLabel: hasGaps ? "Improve records" : "Open settings",
    actionRoute: hasGaps ? ROUTES.MEMBERS : ROUTES.SETTINGS,
  };
}

function buildBusinessHealthInsight(metrics) {
  const priority = metrics.health.score < 50 ? "critical" : metrics.health.score < 70 ? "high" : "medium";

  return {
    id: "business-health",
    type: AI_INSIGHT_TYPES.BUSINESS_HEALTH,
    title: `${metrics.health.status} business health score`,
    message: `${metrics.health.score}% score. ${metrics.health.aiSuggestion}`,
    priority,
    actionLabel: "View reports",
    actionRoute: ROUTES.REPORTS,
  };
}

function getOverdueMemberIds(collections) {
  return Array.from(new Set(
    collections
      .filter((collection) => Number(collection.pending_amount || 0) > 0)
      .map((collection) => collection.member_id)
      .filter(Boolean)
  ));
}

function sortByPriority(a, b) {
  const rank = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return rank[a.priority] - rank[b.priority];
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}
