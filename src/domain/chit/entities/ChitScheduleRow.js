export const ALLOCATION_TYPES = {
  NORMAL: "NORMAL",
  COMPANY_CHIT: "COMPANY_CHIT",
  FOREMAN: "FOREMAN",
  BANK: "BANK",
  ORGANIZER: "ORGANIZER",
  AUCTION: "AUCTION",
  LUCKY_DRAW: "LUCKY_DRAW",
  HYBRID: "HYBRID",
  CUSTOM: "CUSTOM",
};

export const WINNER_SELECTION_MODES = {
  AUCTION: "AUCTION",
  LUCKY_DRAW: "LUCKY_DRAW",
  COMPANY: "COMPANY",
  MANUAL: "MANUAL",
  NONE: "NONE",
};

export class ChitScheduleRow {
  constructor(input = {}) {
    const now = new Date().toISOString();
    this.id = input.id || `schedule-row-${input.groupId || input.group_id || "draft"}-${input.monthNumber || input.month_number || Date.now()}`;
    this.tenantId = input.tenantId || input.tenant_id || "";
    this.workspaceId = input.workspaceId || input.workspace_id || "";
    this.groupId = input.groupId || input.group_id || "";
    this.templateId = input.templateId || input.template_id || "";
    this.monthNumber = Number(input.monthNumber || input.month_number || 1);
    this.monthLabel = input.monthLabel || input.month_label || `Month ${this.monthNumber}`;
    this.standardPayment = toMoney(input.standardPayment ?? input.standard_payment);
    this.nonLiftedPayment = toMoney(input.nonLiftedPayment ?? input.non_lifted_payment ?? this.standardPayment);
    this.liftedPayment = toMoney(input.liftedPayment ?? input.lifted_payment ?? this.standardPayment);
    this.dailyCollectionAmount = toMoney(input.dailyCollectionAmount ?? input.daily_collection_amount);
    this.prizeAmount = toMoney(input.prizeAmount ?? input.prize_amount);
    this.payoutAmount = toMoney(input.payoutAmount ?? input.payout_amount ?? this.prizeAmount);
    this.bidAmount = toMoney(input.bidAmount ?? input.bid_amount);
    this.bidPercentage = toMoney(input.bidPercentage ?? input.bid_percentage);
    this.dividendPerMember = toMoney(input.dividendPerMember ?? input.dividend_per_member);
    this.commissionType = input.commissionType || input.commission_type || "PERCENTAGE";
    this.commissionValue = toMoney(input.commissionValue ?? input.commission_value ?? 5);
    this.commissionAmount = toMoney(input.commissionAmount ?? input.commission_amount);
    this.organizerProfit = toMoney(input.organizerProfit ?? input.organizer_profit);
    this.memberBenefit = toMoney(input.memberBenefit ?? input.member_benefit);
    this.allocationType = input.allocationType || input.allocation_type || ALLOCATION_TYPES.NORMAL;
    this.winnerSelectionMode = input.winnerSelectionMode || input.winner_selection_mode || WINNER_SELECTION_MODES.AUCTION;
    this.penaltyRuleOverride = input.penaltyRuleOverride || input.penalty_rule_override || "";
    this.notes = input.notes || "";
    this.sourceType = input.sourceType || input.source_type || "MANUAL";
    this.confidence = input.confidence || "HIGH";
    this.isUserConfirmed = Boolean(input.isUserConfirmed ?? input.is_user_confirmed);
    this.isManuallyOverridden = Boolean(input.isManuallyOverridden ?? input.is_manually_overridden);
    this.createdAt = input.createdAt || input.created_at || now;
    this.updatedAt = input.updatedAt || input.updated_at || now;
  }

  toJSON() {
    return { ...this };
  }
}

function toMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}
