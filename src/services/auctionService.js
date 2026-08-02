import { AuctionEngine } from "../domain/chit/services/AuctionEngine.js";
import { WinnerEligibilityEngine } from "../domain/chit/services/WinnerEligibilityEngine.js";
import { AuctionValidator } from "../domain/chit/validators/AuctionValidator.js";
import { ChitRuleRepository } from "../repositories/ChitRuleRepository.js";
import { ChitScheduleRepository } from "../repositories/ChitScheduleRepository.js";
import { listWinnerResults, confirmWinnerResult } from "./winnerService.js";
import { listAuctionsPersistent } from "./winnerLifecyclePersistence.js";
import { createEntityId } from "./productionChitPersistence.js";

export async function getAuctionWorkspace({ activeTenantContext, groups = [], members = [] } = {}) {
  const [auctions, winners] = await Promise.all([
    listAuctionsPersistent(activeTenantContext),
    listWinnerResults(activeTenantContext),
  ]);
  return { auctions, winners, groups, members };
}

export async function buildAuctionPreview({
  activeTenantContext,
  group,
  members = [],
  monthNumber = 1,
  bidAmount = 0,
  bidPercentage = 0,
  winnerId = "",
} = {}) {
  const scheduleRow =
    ChitScheduleRepository.listByGroup(group?.id, activeTenantContext).find(
      (row) => Number(row.monthNumber) === Number(monthNumber)
    ) || {
      monthNumber,
      standardPayment: group?.monthly_amount,
      nonLiftedPayment: group?.monthly_amount,
      winnerSelectionMode: "AUCTION",
      isUserConfirmed: true,
    };
  const ruleSet = ChitRuleRepository.getByGroup(group?.id, activeTenantContext) || {
    id: "legacy-rule",
    paymentPatternType: "FIXED",
    liftEffectiveRule: "NEXT_MONTH",
    winnerLockRule: "ONCE_LIFTED_LOCKED",
    minimumBidType: "PERCENTAGE",
    minimumBidValue: 0,
    maximumBidType: "PERCENTAGE",
    maximumBidValue: 100,
    commissionType: "PERCENTAGE",
    commissionValue: 5,
  };
  const [winners, auctions] = await Promise.all([
    listWinnerResults(activeTenantContext),
    listAuctionsPersistent(activeTenantContext),
  ]);
  const eligibleMembers = WinnerEligibilityEngine.getEligibleMembers({
    members,
    group,
    auctions,
    winnerHistory: winners,
    ruleSet,
  });
  const member = eligibleMembers.find((item) => item.id === winnerId) || eligibleMembers[0] || null;
  const preview = AuctionEngine.buildAuctionPreview({
    group,
    scheduleRow,
    ruleSet,
    bidAmount,
    bidPercentage,
  });
  const validation = AuctionValidator.validateAuction({
    auction: { auction_month: monthNumber, bid_amount: preview.bidAmount },
    group,
    scheduleRow,
    ruleSet,
    member,
    bidPreview: preview,
    existingWinners: winners,
  });

  return { scheduleRow, ruleSet, eligibleMembers, member, preview, validation, winners, auctions };
}

export async function confirmAuctionWinner({
  activeTenantContext,
  group,
  members = [],
  monthNumber = 1,
  bidAmount = 0,
  bidPercentage = 0,
  winnerId = "",
  userId = "local-user",
  permissions = {},
  profile = {},
  role = "",
} = {}) {
  const built = await buildAuctionPreview({
    activeTenantContext,
    group,
    members,
    monthNumber,
    bidAmount,
    bidPercentage,
    winnerId,
  });
  if (!built.validation.isValid) {
    return { success: false, ...built, message: built.validation.errors[0] };
  }

  const winner = AuctionEngine.buildWinnerResult({
    group,
    scheduleRow: built.scheduleRow,
    ruleSet: built.ruleSet,
    member: built.member,
    preview: built.preview,
    activeTenantContext,
    userId,
  });

  const confirmed = await confirmWinnerResult({
    winner,
    ruleSet: built.ruleSet,
    activeTenantContext,
    userId,
    memberName: built.member.member_name,
    groupName: group.chit_name,
    eventType: "AUCTION",
    permissions,
    profile,
    role,
    eventExtras: {
      idempotency_key: `auction:${group.id}:${monthNumber}:${built.member.id}:${built.preview.bidAmount}`,
      participants: built.eligibleMembers.map((item) => item.id),
      event_metadata: {
        bid_percentage: built.preview.bidPercentage,
        commission_amount: built.preview.commission,
        organizer_profit: built.preview.organizerProfit,
      },
    },
  });

  if (!confirmed.success) {
    return { success: false, ...built, message: confirmed.message };
  }

  const auction =
    confirmed.auction || {
      id: confirmed.winner?.auction_id || createEntityId(),
      group_id: group.id,
      chit_group_id: group.id,
      auction_month: monthNumber,
      auction_date: new Date().toISOString().slice(0, 10),
      winner_member_id: built.member.id,
      bid_amount: built.preview.bidAmount,
      bid_percentage: built.preview.bidPercentage,
      prize_amount: built.preview.prizeAmount,
      payout_amount: built.preview.payoutAmount,
      dividend_amount: built.preview.dividend,
      commission_amount: built.preview.commission,
      organizer_profit: built.preview.organizerProfit,
      status: "CONFIRMED",
    };

  return {
    success: true,
    auction,
    ...confirmed,
    ...built,
    message: confirmed.message || "Auction winner confirmed and downstream records updated.",
  };
}
