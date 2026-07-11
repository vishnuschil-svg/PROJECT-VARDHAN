import { ActivityRepository } from "../repositories/ActivityRepository.js";
import { FinanceRepository } from "../repositories/chits/FinanceRepository.js";
import { ReportsRepository } from "../repositories/chits/ReportsRepository.js";
import { MemberStateRepository } from "../repositories/MemberStateRepository.js";
import { NotificationRepository } from "../repositories/NotificationRepository.js";
import { WinnerRepository } from "../repositories/WinnerRepository.js";
import { WinnerStateEngine } from "../domain/chit/services/WinnerStateEngine.js";

export function listWinnerResults(activeTenantContext) {
  return WinnerRepository.list(activeTenantContext);
}

export function confirmWinnerResult({ winner, ruleSet = {}, activeTenantContext, userId = "local-user", memberName = "member", groupName = "chit group" } = {}) {
  const { winner: confirmedWinner, memberStatePatch } = WinnerStateEngine.confirmWinner(winner, ruleSet, userId);
  const savedWinner = WinnerRepository.save(confirmedWinner, activeTenantContext);
  const savedMemberState = MemberStateRepository.save(memberStatePatch, activeTenantContext);
  const now = new Date().toISOString();

  FinanceRepository.upsert({
    id: `winner-finance-${savedWinner.id}`,
    type: "payout_obligation",
    category: savedWinner.winnerMode,
    particulars: `${groupName} - ${memberName}`,
    description: `Payout obligation for ${memberName}`,
    amount: savedWinner.payoutAmount,
    cash_in: 0,
    cash_out: 0,
    bank_in: 0,
    bank_out: savedWinner.payoutAmount,
    payment_mode: "Pending",
    status: "Obligation",
    date: now.slice(0, 10),
    created_at: now,
  }, { activeTenantContext });
  ReportsRepository.upsert({
    id: `winner-report-${savedWinner.id}`,
    report_type: "Winner",
    report_name: `${savedWinner.winnerMode} Winner Report`,
    title: `${groupName} Month ${savedWinner.monthNumber}`,
    total_amount: savedWinner.payoutAmount,
    rows: [savedWinner],
    generated_at: now,
    created_at: now,
  }, { activeTenantContext });
  ActivityRepository.addActivity({
    id: `activity-winner-${savedWinner.id}`,
    title: `${savedWinner.winnerMode} winner confirmed`,
    description: `${memberName} confirmed for ${groupName} Month ${savedWinner.monthNumber}.`,
    time: now,
    icon: "Auction",
    route: savedWinner.winnerMode === "LUCKY_DRAW" ? "/chits/lucky-draw" : "/chits/auctions",
  }, activeTenantContext);
  NotificationRepository.addNotification({
    id: `notification-winner-${savedWinner.id}`,
    title: "Winner confirmed",
    message: `${memberName} confirmed for ${groupName} Month ${savedWinner.monthNumber}.`,
    type: savedWinner.winnerMode === "LUCKY_DRAW" ? "LUCKY_DRAW" : "AUCTION_TODAY",
    priority: "high",
    createdAt: now,
    isRead: false,
    actionRoute: savedWinner.winnerMode === "LUCKY_DRAW" ? "/chits/lucky-draw" : "/chits/auctions",
  }, activeTenantContext);

  return { winner: savedWinner, memberState: savedMemberState };
}
