import { ActiveSlotEngine } from "./ActiveSlotEngine.js";
import { ChitArchiveEngine } from "./ChitArchiveEngine.js";
import { MemberLedgerEngine } from "./MemberLedgerEngine.js";
import { MonthClosingEngine } from "./MonthClosingEngine.js";

export const CHIT_LIFECYCLE_STAGES = [
  "CREATE_GROUP",
  "ADD_MEMBERS",
  "ACTIVATE_GROUP",
  "MONTHLY_COLLECTION",
  "AUCTION_OR_LUCKY_DRAW",
  "DECLARE_WINNER",
  "GENERATE_RECEIPT",
  "UPDATE_MEMBER_LEDGER",
  "UPDATE_FINANCE",
  "UPDATE_REPORTS",
  "UPDATE_BUSINESS_HEALTH",
  "CLOSE_MONTH",
  "COMPLETE_CHIT",
  "ARCHIVE_CHIT",
  "REUSE_ACTIVE_SLOT",
];

export const ChitLifecycleEngine = {
  buildLifecycle(source = {}) {
    const groups = source.groups || [];
    const activeGroups = groups.filter((group) => String(group.status || "").toLowerCase() === "active");
    const group = activeGroups[0] || groups[0] || null;
    const groupMembers = (source.members || []).filter((member) =>
      !group || [member.group_id, member.chit_group_id, member.groupId].includes(group.id)
    );
    const groupCollections = (source.collections || []).filter((collection) =>
      !group || [collection.group_id, collection.chit_group_id, collection.groupId].includes(group.id)
    );
    const groupAuctions = (source.auctions || []).filter((auction) =>
      !group || [auction.group_id, auction.chit_group_id, auction.groupId].includes(group.id)
    );
    const currentRunningMonth = getCurrentRunningMonth(group, groupCollections, groupAuctions);
    const currentWinner = getWinnerForMonth(groupAuctions, currentRunningMonth);
    const nextAuction = getNextAuction(group, groupAuctions);
    const collectionProgress = getCollectionProgress(group, groupCollections, currentRunningMonth);
    const completionPercent = getCompletionPercent(group, currentRunningMonth, collectionProgress.percent);
    const memberLedger = MemberLedgerEngine.buildLedger({
      members: groupMembers,
      collections: groupCollections,
      receipts: source.receipts || [],
      auctions: groupAuctions,
    });
    const monthClosing = MonthClosingEngine.buildMonthCloseResult({
      group,
      lifecycleMonth: currentRunningMonth,
      collections: groupCollections,
      auctions: groupAuctions,
      receipts: source.receipts || [],
    });
    const archive = ChitArchiveEngine.buildArchiveState(group || {}, {
      currentRunningMonth,
      completionPercent,
    });
    const activeSlot = ActiveSlotEngine.buildSlotState({ groups });
    const validation = validateLifecycle({ group, groupMembers, groupCollections, groupAuctions, currentRunningMonth, source });

    return {
      group,
      currentRunningMonth,
      currentWinner,
      nextAuction,
      collectionProgress,
      completionPercent,
      memberLedger,
      monthClosing,
      archive,
      activeSlot,
      validation,
      stageStatus: buildStageStatus({ group, groupMembers, groupCollections, groupAuctions, source, monthClosing, archive }),
      automation: {
        finance: "ready",
        reports: "ready",
        dashboardKpis: "ready",
        aiInsights: "ready",
        businessHealth: "ready",
      },
    };
  },
};

function validateLifecycle({ group, groupMembers, groupCollections, groupAuctions, currentRunningMonth, source }) {
  const errors = [];
  const warnings = [];

  if (!group) errors.push("No chit group available.");
  if (group && !canActivateGroup(group, groupMembers)) errors.push("Cannot activate incomplete group.");
  if (hasDuplicateReceipt(source.receipts || [])) errors.push("Cannot duplicate receipt.");
  if (hasDuplicateWinner(groupAuctions, currentRunningMonth)) errors.push("Cannot declare two winners in same month.");
  if (isMonthClosed(groupCollections, currentRunningMonth)) warnings.push("Cannot collect after month close.");

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function buildStageStatus({ group, groupMembers, groupCollections, groupAuctions, source, monthClosing, archive }) {
  return CHIT_LIFECYCLE_STAGES.map((stage) => ({
    stage,
    complete: isStageComplete(stage, { group, groupMembers, groupCollections, groupAuctions, source, monthClosing, archive }),
  }));
}

function isStageComplete(stage, context) {
  const { group, groupMembers, groupCollections, groupAuctions, source, monthClosing, archive } = context;
  const hasGroup = Boolean(group?.id);

  const map = {
    CREATE_GROUP: hasGroup,
    ADD_MEMBERS: groupMembers.length > 0,
    ACTIVATE_GROUP: String(group?.status || "").toLowerCase() === "active",
    MONTHLY_COLLECTION: groupCollections.length > 0,
    AUCTION_OR_LUCKY_DRAW: groupAuctions.length > 0 || Boolean(group?.next_auction_date),
    DECLARE_WINNER: groupAuctions.some((auction) => auction.winner_member_id || auction.winnerMemberId),
    GENERATE_RECEIPT: (source.receipts || []).length > 0 || groupCollections.some((collection) => collection.receipt_number),
    UPDATE_MEMBER_LEDGER: groupMembers.length > 0,
    UPDATE_FINANCE: (source.financeEntries || []).length > 0 || groupCollections.length > 0,
    UPDATE_REPORTS: hasGroup,
    UPDATE_BUSINESS_HEALTH: hasGroup,
    CLOSE_MONTH: monthClosing.canClose,
    COMPLETE_CHIT: archive.canArchive || String(group?.status || "").toLowerCase() === "closed",
    ARCHIVE_CHIT: archive.isArchived,
    REUSE_ACTIVE_SLOT: true,
  };

  return Boolean(map[stage]);
}

function canActivateGroup(group, members) {
  const requiredMembers = Number(group.total_members || group.totalMembers || 0);
  return Boolean(group.chit_name || group.name) &&
    Number(group.chit_value || group.chitValue || 0) > 0 &&
    Number(group.monthly_amount || group.monthlyAmount || 0) > 0 &&
    requiredMembers > 0 &&
    members.length <= requiredMembers;
}

function getCurrentRunningMonth(group, collections, auctions) {
  const collectionMonth = Math.max(0, ...collections.map((collection) => Number(collection.installment_month || collection.installmentNumber || 0)));
  const auctionMonth = Math.max(0, ...auctions.map((auction) => Number(auction.auction_month || auction.month || 0)));
  const current = Math.max(collectionMonth, auctionMonth, 1);
  const totalMonths = Number(group?.total_months || group?.totalMonths || current);
  return Math.min(current, totalMonths || current);
}

function getWinnerForMonth(auctions, month) {
  const auction = auctions.find((item) => Number(item.auction_month || item.month || 0) === Number(month || 0))
    || auctions.find((item) => item.winner_member_id || item.winnerMemberId)
    || null;

  if (!auction) return null;

  return {
    memberId: auction.winner_member_id || auction.winnerMemberId || "",
    auctionId: auction.id,
    amount: Number(auction.bid_amount || auction.lift_amount || 0),
    month: Number(auction.auction_month || auction.month || month || 0),
  };
}

function getNextAuction(group, auctions) {
  const today = new Date().toISOString().slice(0, 10);
  const scheduledAuction = auctions
    .filter((auction) => (auction.auction_date || "") >= today)
    .sort((a, b) => String(a.auction_date).localeCompare(String(b.auction_date)))[0];

  if (scheduledAuction) {
    return {
      date: scheduledAuction.auction_date,
      groupName: group?.chit_name || group?.name || "",
      month: Number(scheduledAuction.auction_month || scheduledAuction.month || 0),
    };
  }

  return {
    date: group?.next_auction_date || "",
    groupName: group?.chit_name || group?.name || "",
    month: getCurrentRunningMonth(group, [], auctions) + 1,
  };
}

function getCollectionProgress(group, collections, month) {
  const monthCollections = collections.filter((collection) =>
    Number(collection.installment_month || collection.installmentNumber || month || 0) === Number(month || 0)
  );
  const expectedAmount = Number(group?.monthly_amount || group?.monthlyAmount || 0) * Number(group?.total_members || group?.totalMembers || 0);
  const collectedAmount = monthCollections.reduce((sum, collection) => sum + Number(collection.paid_amount || collection.paidAmount || 0), 0);
  const percent = expectedAmount ? Math.min(100, Math.round((collectedAmount / expectedAmount) * 100)) : 0;

  return {
    expectedAmount,
    collectedAmount,
    pendingAmount: Math.max(0, expectedAmount - collectedAmount),
    percent,
  };
}

function getCompletionPercent(group, currentMonth, collectionPercent) {
  const totalMonths = Number(group?.total_months || group?.totalMonths || 0);
  if (!totalMonths) return 0;
  const monthProgress = Math.min(100, Math.round((Number(currentMonth || 0) / totalMonths) * 100));
  return Math.min(100, Math.round(monthProgress * 0.8 + Number(collectionPercent || 0) * 0.2));
}

function hasDuplicateReceipt(receipts) {
  const numbers = receipts.map((receipt) => receipt.receipt_number || receipt.receiptNumber).filter(Boolean);
  return new Set(numbers).size !== numbers.length;
}

function hasDuplicateWinner(auctions, month) {
  return auctions.filter((auction) =>
    Number(auction.auction_month || auction.month || 0) === Number(month || 0) &&
    (auction.winner_member_id || auction.winnerMemberId)
  ).length > 1;
}

function isMonthClosed(collections, month) {
  return collections.some((collection) =>
    Number(collection.installment_month || collection.installmentNumber || 0) === Number(month || 0) &&
    String(collection.month_status || collection.monthStatus || "").toLowerCase() === "closed"
  );
}
