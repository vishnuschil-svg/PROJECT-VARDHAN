import { ActivityRepository } from "../repositories/ActivityRepository.js";
import { ReportsRepository } from "../repositories/chits/ReportsRepository.js";
import { NotificationRepository } from "../repositories/NotificationRepository.js";
import { WinnerStateEngine } from "../domain/chit/services/WinnerStateEngine.js";
import {
  assertOperatorRole,
  cancelWinnerEventPersistent,
  confirmWinnerEventPersistent,
  listWinnersPersistent,
} from "./winnerLifecyclePersistence.js";
import { createEntityId } from "./productionChitPersistence.js";

export async function listWinnerResults(activeTenantContext) {
  return listWinnersPersistent(activeTenantContext);
}

export async function confirmWinnerResult({
  winner,
  ruleSet = {},
  activeTenantContext,
  userId = "local-user",
  memberName = "member",
  groupName = "chit group",
  eventType = "AUCTION",
  permissions = {},
  profile = {},
  role = "",
  eventExtras = {},
} = {}) {
  if (!assertOperatorRole(permissions, profile, role)) {
    return {
      success: false,
      message: "Unauthorized role for winner confirmation.",
    };
  }

  const { winner: confirmedWinner, memberStatePatch } = WinnerStateEngine.confirmWinner(
    winner,
    ruleSet,
    userId
  );

  const idempotencyKey =
    eventExtras.idempotency_key ||
    `winner:${activeTenantContext?.tenant_id}:${activeTenantContext?.data_scope}:${confirmedWinner.groupId || confirmedWinner.group_id}:${confirmedWinner.monthNumber}:${eventType}`;

  const persisted = await confirmWinnerEventPersistent(
    {
      event_type: eventType,
      group_id: confirmedWinner.groupId || confirmedWinner.group_id,
      member_id: confirmedWinner.memberId || confirmedWinner.member_id,
      month_number: confirmedWinner.monthNumber,
      winner_mode: confirmedWinner.winnerMode,
      bid_amount: confirmedWinner.bidAmount,
      bid_percentage: confirmedWinner.bidPercentage,
      prize_amount: confirmedWinner.prizeAmount,
      payout_amount: confirmedWinner.payoutAmount,
      dividend_amount: confirmedWinner.dividend,
      commission_amount: confirmedWinner.commission,
      organizer_profit: confirmedWinner.organizerProfit,
      confirmed_by: userId,
      event_date: new Date().toISOString().slice(0, 10),
      create_payout_plan: true,
      finance_particulars: `${groupName} - ${memberName}`,
      finance_description: `Payout obligation for ${memberName}`,
      ledger_description: `${memberName} lifted for ${groupName} month ${confirmedWinner.monthNumber}`,
      idempotency_key: idempotencyKey,
      participants: eventExtras.participants || [],
      random_value: eventExtras.random_value,
      winner_index: eventExtras.winner_index,
      deterministic_seed: eventExtras.deterministic_seed,
      event_metadata: eventExtras.event_metadata || {},
      winner_metadata: {
        member_state: memberStatePatch,
        source_winner_id: confirmedWinner.id,
      },
    },
    activeTenantContext
  );

  const savedWinner = persisted.winner || confirmedWinner;
  const now = new Date().toISOString();

  ReportsRepository.upsert(
    {
      id: `winner-report-${savedWinner.id || createEntityId()}`,
      report_type: "Winner",
      report_name: `${savedWinner.winnerMode || eventType} Winner Report`,
      title: `${groupName} Month ${savedWinner.monthNumber || confirmedWinner.monthNumber}`,
      total_amount: savedWinner.payoutAmount || confirmedWinner.payoutAmount,
      rows: [savedWinner],
      generated_at: now,
      created_at: now,
    },
    { activeTenantContext }
  );
  ActivityRepository.addActivity(
    {
      id: `activity-winner-${savedWinner.id || createEntityId()}`,
      title: `${savedWinner.winnerMode || eventType} winner confirmed`,
      description: `${memberName} confirmed for ${groupName} Month ${confirmedWinner.monthNumber}.`,
      time: now,
      icon: "Auction",
      route: eventType === "LUCKY_DRAW" ? "/chits/lucky-draw" : "/chits/auctions",
    },
    activeTenantContext
  );
  NotificationRepository.addNotification(
    {
      id: `notification-winner-${savedWinner.id || createEntityId()}`,
      title: "Winner confirmed",
      message: `${memberName} confirmed for ${groupName} Month ${confirmedWinner.monthNumber}.`,
      type: eventType === "LUCKY_DRAW" ? "LUCKY_DRAW" : "AUCTION_TODAY",
      priority: "high",
      createdAt: now,
      isRead: false,
      actionRoute: eventType === "LUCKY_DRAW" ? "/chits/lucky-draw" : "/chits/auctions",
    },
    activeTenantContext
  );

  return {
    success: true,
    winner: savedWinner,
    memberState: memberStatePatch,
    auction: persisted.auction,
    draw: persisted.draw,
    payout: persisted.payout,
    idempotent: persisted.idempotent,
    message: persisted.message,
  };
}

export async function cancelWinnerResult({
  winnerId,
  reason,
  activeTenantContext,
  userId = "local-user",
  permissions = {},
  profile = {},
  role = "",
} = {}) {
  const canCorrect =
    permissions?.isPlatformOwner ||
    ["owner", "admin", "platform_owner"].includes(String(role || profile?.role || "").toLowerCase()) ||
    permissions?.actions?.correct_winner === true;

  if (!canCorrect) {
    return { success: false, message: "Unauthorized role for winner correction." };
  }
  if (!reason) {
    return { success: false, message: "Winner cancellation requires a reason." };
  }

  const result = await cancelWinnerEventPersistent(
    { winner_id: winnerId, reason, cancelled_by: userId },
    activeTenantContext
  );

  ActivityRepository.addActivity(
    {
      id: `activity-winner-cancel-${winnerId || createEntityId()}`,
      title: "Winner correction recorded",
      description: `Winner ${winnerId} cancelled: ${reason}`,
      time: new Date().toISOString(),
      icon: "Auction",
      route: "/chits/auctions",
    },
    activeTenantContext
  );

  return { success: true, ...result };
}
