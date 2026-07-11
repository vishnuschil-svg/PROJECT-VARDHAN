import { ActivityRepository } from "../repositories/ActivityRepository.js";
import { getAIInsights } from "./aiInsightsService.js";
import { getBusinessHealth } from "./businessHealthService.js";

const ROUTES = {
  COLLECTIONS: "/chits/collections",
  RECEIPTS: "/chits/receipts",
  MEMBERS: "/chits/members",
  AUCTIONS: "/chits/auctions",
  FINANCE: "/chits/finance",
  SETTINGS: "/chits/settings",
  REPORTS: "/chits/reports",
};

export function getActivityTimeline(activeTenantContext) {
  const snapshot = ActivityRepository.getSnapshot(activeTenantContext);
  const activities = buildActivities(snapshot, activeTenantContext);

  return activities.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
}

function buildActivities({
  groups = [],
  members = [],
  collections = [],
  financeEntries = [],
  customActivities = [],
}, activeTenantContext) {
  const hasBusinessData = groups.length > 0 || members.length > 0 || collections.length > 0 || financeEntries.length > 0;
  if (!hasBusinessData && customActivities.length === 0) {
    return [];
  }

  const latestCollection = collections[0] || null;
  const latestMember = members[0] || null;
  const latestFinance = financeEntries[0] || null;
  const today = new Date().toISOString();
  const nextAuction = groups
    .filter((group) => group.next_auction_date)
    .sort((a, b) => String(b.next_auction_date).localeCompare(String(a.next_auction_date)))[0];
  const aiInsight = getAIInsights(activeTenantContext)[0];
  const health = getBusinessHealth(activeTenantContext);

  return [
    ...customActivities.map((activity) => ({
      id: activity.id,
      title: activity.title,
      description: activity.description,
      time: activity.time,
      icon: activity.icon || "System",
      route: activity.route || ROUTES.REPORTS,
    })),
    latestCollection && {
      id: `activity-collection-${latestCollection.id}`,
      title: "Collection posted",
      description: `${formatCurrency(latestCollection.paid_amount)} received for ${latestCollection.collection_month || "current month"}.`,
      time: latestCollection.created_at || latestCollection.payment_date || today,
      icon: "Collection",
      route: ROUTES.COLLECTIONS,
    },
    latestCollection && {
      id: `activity-receipt-${latestCollection.id}`,
      title: "Receipt ready",
      description: `${latestCollection.receipt_number || "Receipt"} is available for print and sharing.`,
      time: latestCollection.updated_at || latestCollection.created_at || today,
      icon: "Receipt",
      route: ROUTES.RECEIPTS,
    },
    latestMember && {
      id: `activity-member-${latestMember.id}`,
      title: "Member register updated",
      description: `${latestMember.member_name || "Member"} is linked to the active workspace.`,
      time: latestMember.updated_at || latestMember.created_at || latestMember.join_date || today,
      icon: "Member",
      route: ROUTES.MEMBERS,
    },
    nextAuction && {
      id: `activity-auction-${nextAuction.id}`,
      title: "Auction schedule updated",
      description: `${nextAuction.chit_name || nextAuction.chit_code} auction date is ${nextAuction.next_auction_date}.`,
      time: nextAuction.updated_at || nextAuction.next_auction_date || today,
      icon: "Auction",
      route: ROUTES.AUCTIONS,
    },
    latestFinance && {
      id: `activity-finance-${latestFinance.id}`,
      title: "Finance entry recorded",
      description: `${latestFinance.particulars || latestFinance.category || "Finance entry"} for ${formatCurrency(latestFinance.amount)}.`,
      time: latestFinance.date || latestFinance.created_at || today,
      icon: "Finance",
      route: ROUTES.FINANCE,
    },
    hasBusinessData && {
      id: "activity-settings-repository",
      title: "Repository services connected",
      description: "Dashboard data is flowing through tenant-scoped repository boundaries.",
      time: today,
      icon: "Settings",
      route: ROUTES.SETTINGS,
    },
    aiInsight && {
      id: `activity-ai-${aiInsight?.id || "ready"}`,
      title: aiInsight?.title || "AI insight generated",
      description: aiInsight?.message || "AI recommendations are ready for this workspace.",
      time: today,
      icon: "AI",
      route: aiInsight?.actionRoute || ROUTES.REPORTS,
    },
    hasBusinessData && {
      id: "activity-system-health",
      title: "Business health refreshed",
      description: `${health.status} status with ${health.score}% score.`,
      time: today,
      icon: "System",
      route: ROUTES.REPORTS,
    },
  ].filter(Boolean);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}
