export const PAYOUT_MODES = {
  FULL: "FULL",
  PARTIAL: "PARTIAL",
  INSTALLMENTS: "INSTALLMENTS",
  CUSTOM: "CUSTOM",
};

export const PAYOUT_STATUS = {
  PENDING: "PENDING",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  PAID: "PAID",
  HELD: "HELD",
  CANCELLED: "CANCELLED",
};

export class PayoutPlan {
  constructor(input = {}) {
    const now = new Date().toISOString();
    const totalPayout = Number(input.totalPayout || input.total_payout || 0);
    const paidAmount = Number(input.paidAmount || input.paid_amount || 0);
    this.id = input.id || `payout-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.tenantId = input.tenantId || input.tenant_id || "";
    this.workspaceId = input.workspaceId || input.workspace_id || "";
    this.groupId = input.groupId || input.group_id || "";
    this.winnerId = input.winnerId || input.winner_id || "";
    this.winnerResultId = input.winnerResultId || input.winner_result_id || "";
    this.payoutMode = input.payoutMode || input.payout_mode || PAYOUT_MODES.FULL;
    this.totalPayout = totalPayout;
    this.paidAmount = paidAmount;
    this.pendingAmount = Math.max(0, totalPayout - paidAmount);
    this.installmentCount = Number(input.installmentCount || input.installment_count || 0);
    this.installmentSchedule = input.installmentSchedule || input.installment_schedule || [];
    this.status = input.status || resolveStatus(totalPayout, paidAmount);
    this.notes = input.notes || "";
    this.createdAt = input.createdAt || input.created_at || now;
    this.updatedAt = input.updatedAt || input.updated_at || now;
  }

  toJSON() {
    return { ...this };
  }
}

function resolveStatus(totalPayout, paidAmount) {
  if (paidAmount <= 0) return PAYOUT_STATUS.PENDING;
  if (paidAmount >= totalPayout) return PAYOUT_STATUS.PAID;
  return PAYOUT_STATUS.PARTIALLY_PAID;
}
