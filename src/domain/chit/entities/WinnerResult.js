export const WINNER_MODES = {
  AUCTION: "AUCTION",
  LUCKY_DRAW: "LUCKY_DRAW",
  COMPANY: "COMPANY",
  FOREMAN: "FOREMAN",
  MANUAL: "MANUAL",
};

export const WINNER_STATUS = {
  PROVISIONAL: "PROVISIONAL",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
};

export class WinnerResult {
  constructor(input = {}) {
    const now = new Date().toISOString();
    this.id = input.id || `winner-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.tenantId = input.tenantId || input.tenant_id || "";
    this.workspaceId = input.workspaceId || input.workspace_id || "";
    this.groupId = input.groupId || input.group_id || input.chit_group_id || "";
    this.monthNumber = Number(input.monthNumber || input.month_number || input.auction_month || 1);
    this.memberId = input.memberId || input.member_id || input.winner_member_id || "";
    this.winnerMode = input.winnerMode || input.winner_mode || WINNER_MODES.AUCTION;
    this.bidAmount = Number(input.bidAmount || input.bid_amount || 0);
    this.bidPercentage = Number(input.bidPercentage || input.bid_percentage || 0);
    this.prizeAmount = Number(input.prizeAmount || input.prize_amount || 0);
    this.payoutAmount = Number(input.payoutAmount || input.payout_amount || this.prizeAmount || 0);
    this.dividend = Number(input.dividend || input.dividend_amount || 0);
    this.commission = Number(input.commission || input.commission_amount || 0);
    this.organizerProfit = Number(input.organizerProfit || input.organizer_profit || 0);
    this.status = input.status || WINNER_STATUS.PROVISIONAL;
    this.confirmedBy = input.confirmedBy || input.confirmed_by || "";
    this.confirmedAt = input.confirmedAt || input.confirmed_at || "";
    this.cancelledBy = input.cancelledBy || input.cancelled_by || "";
    this.cancelledAt = input.cancelledAt || input.cancelled_at || "";
    this.cancellationReason = input.cancellationReason || input.cancellation_reason || "";
    this.createdAt = input.createdAt || input.created_at || now;
    this.updatedAt = input.updatedAt || input.updated_at || now;
  }

  confirm(userId = "local-user") {
    return new WinnerResult({
      ...this,
      status: WINNER_STATUS.CONFIRMED,
      confirmedBy: userId,
      confirmedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).toJSON();
  }

  cancel({ userId = "local-user", reason = "" } = {}) {
    if (!reason) throw new Error("Cancellation reason is required.");
    return new WinnerResult({
      ...this,
      status: WINNER_STATUS.CANCELLED,
      cancelledBy: userId,
      cancelledAt: new Date().toISOString(),
      cancellationReason: reason,
      updatedAt: new Date().toISOString(),
    }).toJSON();
  }

  toJSON() {
    return { ...this };
  }
}
