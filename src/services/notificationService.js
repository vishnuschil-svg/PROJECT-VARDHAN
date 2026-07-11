import { NotificationRepository } from "../repositories/NotificationRepository.js";
import { getAIInsights } from "./aiInsightsService.js";

export const NOTIFICATION_TYPES = {
  PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
  PAYMENT_PENDING: "PAYMENT_PENDING",
  AUCTION_TODAY: "AUCTION_TODAY",
  LUCKY_DRAW: "LUCKY_DRAW",
  MEMBER_ADDED: "MEMBER_ADDED",
  MEMBER_UPDATED: "MEMBER_UPDATED",
  RECEIPT_GENERATED: "RECEIPT_GENERATED",
  SYSTEM_ALERT: "SYSTEM_ALERT",
  BACKUP_COMPLETED: "BACKUP_COMPLETED",
  AI_RECOMMENDATION: "AI_RECOMMENDATION",
};

const ROUTES = {
  COLLECTIONS: "/chits/collections",
  PENDING: "/chits/collections/pending",
  AUCTIONS: "/chits/auctions",
  LUCKY_DRAW: "/chits/lucky-draw",
  MEMBERS: "/chits/members",
  RECEIPTS: "/chits/receipts",
  REPORTS: "/chits/reports",
  SETTINGS: "/chits/settings",
};

export function getNotificationCenter(activeTenantContext) {
  const snapshot = NotificationRepository.getSnapshot(activeTenantContext);
  const notifications = buildNotifications(snapshot, activeTenantContext);

  return {
    unreadCount: notifications.filter((notification) => !notification.isRead).length,
    notifications,
  };
}

export function markNotificationRead(notificationId) {
  NotificationRepository.markRead(notificationId);
}

export function markAllNotificationsRead(notifications = []) {
  NotificationRepository.markAllRead(notifications.map((notification) => notification.id));
}

function buildNotifications({
  groups = [],
  members = [],
  collections = [],
  readIds = [],
  customNotifications = [],
}, activeTenantContext) {
  const hasBusinessData = groups.length > 0 || members.length > 0 || collections.length > 0;
  if (!hasBusinessData && customNotifications.length === 0) {
    return [];
  }

  const readSet = new Set(readIds);
  const latestCollection = collections[0] || null;
  const latestMember = members[0] || null;
  const today = new Date().toISOString().slice(0, 10);
  const pendingAmount = collections.length
    ? collections.reduce((sum, collection) => sum + Number(collection.pending_amount || 0), 0)
    : groups.reduce((sum, group) => sum + Number(group.pending_collections || 0), 0);
  const auctionToday = groups.find((group) => group.next_auction_date === today);
  const upcomingAuction = groups.find((group) =>
    group.next_auction_date &&
    group.next_auction_date >= today &&
    !isStatus(group.status, "CLOSED") &&
    !isStatus(group.status, "ARCHIVED")
  );
  const topInsight = getAIInsights(activeTenantContext)[0];

  return [
    ...customNotifications.map((notification) => createNotification({
      ...notification,
      readSet,
    })),
    latestCollection && createNotification({
      id: latestCollection ? `payment-received-${latestCollection.id}` : "payment-received-empty",
      title: latestCollection ? "Payment received" : "Collection desk ready",
      message: latestCollection
        ? `${formatCurrency(latestCollection.paid_amount)} received for ${latestCollection.collection_month || "current month"}.`
        : "No collection has been posted yet for this workspace.",
      type: NOTIFICATION_TYPES.PAYMENT_RECEIVED,
      priority: latestCollection ? "medium" : "low",
      createdAt: latestCollection?.created_at || today,
      actionRoute: ROUTES.COLLECTIONS,
      readSet,
    }),
    pendingAmount > 0 && createNotification({
      id: `payment-pending-${pendingAmount}`,
      title: pendingAmount > 0 ? "Pending payment follow-up" : "Pending collection clear",
      message: pendingAmount > 0
        ? `${formatCurrency(pendingAmount)} is waiting for follow-up.`
        : "No pending amount is visible from current records.",
      type: NOTIFICATION_TYPES.PAYMENT_PENDING,
      priority: pendingAmount > 0 ? "high" : "low",
      createdAt: today,
      actionRoute: ROUTES.PENDING,
      readSet,
    }),
    (auctionToday || upcomingAuction) && createNotification({
      id: auctionToday ? `auction-today-${auctionToday.id}` : `auction-upcoming-${upcomingAuction?.id || "none"}`,
      title: auctionToday ? "Auction scheduled today" : "Auction schedule monitor",
      message: auctionToday
        ? `${auctionToday.chit_name || auctionToday.chit_code} is scheduled today.`
        : upcomingAuction
          ? `${upcomingAuction.chit_name || upcomingAuction.chit_code} is scheduled on ${upcomingAuction.next_auction_date}.`
          : "No upcoming auction is visible in active groups.",
      type: NOTIFICATION_TYPES.AUCTION_TODAY,
      priority: auctionToday ? "critical" : "medium",
      createdAt: today,
      actionRoute: ROUTES.AUCTIONS,
      readSet,
    }),
    latestMember && createNotification({
      id: latestMember ? `member-added-${latestMember.id}` : "member-added-empty",
      title: latestMember ? "Latest member profile available" : "Member register ready",
      message: latestMember
        ? `${latestMember.member_name || "Member"} is available in the member register.`
        : "No member profile is visible for this workspace yet.",
      type: NOTIFICATION_TYPES.MEMBER_ADDED,
      priority: "medium",
      createdAt: latestMember?.created_at || latestMember?.join_date || today,
      actionRoute: ROUTES.MEMBERS,
      readSet,
    }),
    latestMember && createNotification({
      id: "member-updated-quality",
      title: "Member records need review",
      message: "Keep contact and KYC fields updated so reminders and receipts stay reliable.",
      type: NOTIFICATION_TYPES.MEMBER_UPDATED,
      priority: "medium",
      createdAt: today,
      actionRoute: ROUTES.MEMBERS,
      readSet,
    }),
    latestCollection && createNotification({
      id: latestCollection ? `receipt-generated-${latestCollection.id}` : "receipt-generated-empty",
      title: latestCollection ? "Receipt generation available" : "Receipt center ready",
      message: latestCollection
        ? `Receipt actions are ready for ${latestCollection.receipt_number || "latest collection"}.`
        : "Receipts will appear after collections are posted.",
      type: NOTIFICATION_TYPES.RECEIPT_GENERATED,
      priority: "low",
      createdAt: latestCollection?.created_at || today,
      actionRoute: ROUTES.RECEIPTS,
      readSet,
    }),
    topInsight && createNotification({
      id: `ai-recommendation-${topInsight?.id || "empty"}`,
      title: topInsight?.title || "AI recommendation ready",
      message: topInsight?.message || "AI insights will become richer as chit activity grows.",
      type: NOTIFICATION_TYPES.AI_RECOMMENDATION,
      priority: topInsight?.priority || "medium",
      createdAt: today,
      actionRoute: topInsight?.actionRoute || ROUTES.REPORTS,
      readSet,
    }),
  ].filter(Boolean).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function createNotification({
  id,
  title,
  message,
  type,
  priority,
  createdAt,
  actionRoute,
  readSet,
}) {
  return {
    id,
    title,
    message,
    type,
    priority,
    createdAt,
    isRead: readSet.has(id),
    actionRoute,
  };
}

function isStatus(value, status) {
  return String(value || "").toUpperCase() === String(status || "").toUpperCase();
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}
