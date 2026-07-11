export const PAYMENT_PATTERN_TYPES = {
  FIXED: "FIXED",
  MONTH_WISE_VARIABLE: "MONTH_WISE_VARIABLE",
  LIFTED_NON_LIFTED: "LIFTED_NON_LIFTED",
  AUCTION_DIVIDEND: "AUCTION_DIVIDEND",
  PAYOUT_SCHEDULE: "PAYOUT_SCHEDULE",
  HYBRID: "HYBRID",
  CUSTOM: "CUSTOM",
};

export const LIFT_EFFECTIVE_RULES = {
  NEXT_MONTH: "NEXT_MONTH",
  SAME_MONTH: "SAME_MONTH",
  CUSTOM: "CUSTOM",
};

export const WINNER_LOCK_RULES = {
  ONCE_LIFTED_LOCKED: "ONCE_LIFTED_LOCKED",
  CUSTOM: "CUSTOM",
};

export class ChitRuleSet {
  constructor(input = {}) {
    const now = new Date().toISOString();
    this.id = input.id || `rule-set-${input.groupId || input.group_id || input.templateId || input.template_id || Date.now()}`;
    this.tenantId = input.tenantId || input.tenant_id || "";
    this.workspaceId = input.workspaceId || input.workspace_id || "";
    this.groupId = input.groupId || input.group_id || "";
    this.templateId = input.templateId || input.template_id || "";
    this.paymentPatternType = input.paymentPatternType || input.payment_pattern_type || PAYMENT_PATTERN_TYPES.FIXED;
    this.liftEffectiveRule = input.liftEffectiveRule || input.lift_effective_rule || LIFT_EFFECTIVE_RULES.NEXT_MONTH;
    this.winnerLockRule = input.winnerLockRule || input.winner_lock_rule || WINNER_LOCK_RULES.ONCE_LIFTED_LOCKED;
    this.penaltyType = input.penaltyType || input.penalty_type || "NONE";
    this.penaltyValue = Number(input.penaltyValue || input.penalty_value || 0);
    this.penaltyGraceDays = Number(input.penaltyGraceDays || input.penalty_grace_days || 0);
    this.penaltyManualOverrideAllowed = Boolean(input.penaltyManualOverrideAllowed ?? input.penalty_manual_override_allowed ?? true);
    this.auctionEnabled = Boolean(input.auctionEnabled ?? input.auction_enabled ?? true);
    this.luckyDrawEnabled = Boolean(input.luckyDrawEnabled ?? input.lucky_draw_enabled);
    this.hybridEnabled = Boolean(input.hybridEnabled ?? input.hybrid_enabled);
    this.minimumBidType = input.minimumBidType || input.minimum_bid_type || "PERCENTAGE";
    this.minimumBidValue = Number(input.minimumBidValue || input.minimum_bid_value || 0);
    this.maximumBidType = input.maximumBidType || input.maximum_bid_type || "PERCENTAGE";
    this.maximumBidValue = Number(input.maximumBidValue || input.maximum_bid_value || 100);
    this.commissionType = input.commissionType || input.commission_type || "PERCENTAGE";
    this.commissionValue = Number(input.commissionValue || input.commission_value || 5);
    this.memberReplacementAllowed = Boolean(input.memberReplacementAllowed ?? input.member_replacement_allowed);
    this.previousHistoryRequired = Boolean(input.previousHistoryRequired ?? input.previous_history_required);
    this.receiptCancellationRequiresReason = Boolean(input.receiptCancellationRequiresReason ?? input.receipt_cancellation_requires_reason ?? true);
    this.monthReopenRequiresPermission = Boolean(input.monthReopenRequiresPermission ?? input.month_reopen_requires_permission ?? true);
    this.overpaymentRule = input.overpaymentRule || input.overpayment_rule || "TRACK_ADVANCE";
    this.advancePaymentRule = input.advancePaymentRule || input.advance_payment_rule || "ALLOW_WITH_TRACE";
    this.partialPaymentRule = input.partialPaymentRule || input.partial_payment_rule || "ALLOW_PENDING";
    this.customRules = input.customRules || input.custom_rules || {};
    this.version = Number(input.version || 1);
    this.status = input.status || "DRAFT";
    this.createdAt = input.createdAt || input.created_at || now;
    this.updatedAt = input.updatedAt || input.updated_at || now;
  }

  toJSON() {
    return { ...this };
  }
}
