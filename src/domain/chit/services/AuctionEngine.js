import { AuctionResult } from "../valueObjects/AuctionResult.js";
import { WINNER_MODES } from "../entities/WinnerResult.js";
import { ChitCalculationEngine } from "./ChitCalculationEngine.js";
import { RuleEngine } from "./RuleEngine.js";
import { WinnerStateEngine } from "./WinnerStateEngine.js";

export const AuctionEngine = {
  calculateAuction({ group = {}, auction = {}, commissionRate = 5 } = {}) {
    const chitValue = Number(group.chit_value || group.chitValue || 0);
    const bidAmount = Number(auction.bid_amount || auction.bidAmount || auction.lift_amount || 0);
    const commission = ChitCalculationEngine.calculateCommission(chitValue, commissionRate);
    const discount = ChitCalculationEngine.calculateDiscount(chitValue, bidAmount);
    const dividend = ChitCalculationEngine.calculateDividend(
      Math.max(0, discount - commission),
      group.total_members || group.totalMembers
    );
    const prizeAmount = ChitCalculationEngine.calculatePrizeAmount(chitValue, discount, commission);

    return new AuctionResult({ prizeAmount, discount, dividend, commission }).toJSON();
  },

  buildAuctionPreview({ group = {}, scheduleRow = {}, ruleSet = {}, bidAmount = 0, bidPercentage = 0 } = {}) {
    const chitValue = Number(group.chit_value || group.chitValue || 0);
    const resolvedBid = Number(bidAmount || 0) || Math.round((chitValue * Number(bidPercentage || 0)) / 100);
    const commission = RuleEngine.resolveCommission({ amount: chitValue, ruleSet, scheduleRow });
    const discount = ChitCalculationEngine.calculateDiscount(chitValue, resolvedBid);
    const dividend = ChitCalculationEngine.calculateDividend(
      Math.max(0, discount - commission),
      group.total_members || group.totalMembers
    );
    const prizeAmount = scheduleRow.prizeAmount || ChitCalculationEngine.calculatePrizeAmount(chitValue, discount, commission);
    const payoutAmount = scheduleRow.payoutAmount || prizeAmount;
    const organizerProfit = Math.max(0, commission + Number(scheduleRow.organizerProfit || 0));
    const bidValidation = RuleEngine.isBidWithinLimits({ bidAmount: resolvedBid, chitValue, ruleSet });

    return {
      chitValue,
      bidAmount: resolvedBid,
      bidPercentage: bidPercentage || (chitValue ? Math.round((resolvedBid / chitValue) * 10000) / 100 : 0),
      prizeAmount,
      payoutAmount,
      discount,
      dividend,
      commission,
      organizerProfit,
      bidValidation,
      explanation: `Bid ${resolvedBid} creates discount ${discount}, commission ${commission}, dividend ${dividend}, payout ${payoutAmount}.`,
    };
  },

  buildWinnerResult({ group = {}, scheduleRow = {}, member = {}, preview = {}, activeTenantContext = {}, userId = "local-user" } = {}) {
    return WinnerStateEngine.buildWinner({
      tenantId: activeTenantContext.tenant_id,
      workspaceId: activeTenantContext.workspace_id || activeTenantContext.workspaceId || "",
      groupId: group.id,
      monthNumber: scheduleRow.monthNumber || 1,
      memberId: member.id,
      winnerMode: scheduleRow.winnerSelectionMode === "MANUAL" ? WINNER_MODES.MANUAL : WINNER_MODES.AUCTION,
      bidAmount: preview.bidAmount,
      bidPercentage: preview.bidPercentage,
      prizeAmount: preview.prizeAmount,
      payoutAmount: preview.payoutAmount,
      dividend: preview.dividend,
      commission: preview.commission,
      organizerProfit: preview.organizerProfit,
      status: "CONFIRMED",
      confirmedBy: userId,
      confirmedAt: new Date().toISOString(),
    });
  },
};
