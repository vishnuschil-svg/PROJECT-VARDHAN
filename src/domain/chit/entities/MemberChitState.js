export const MEMBER_CHIT_STATES = {
  ACTIVE_NON_LIFTED: "ACTIVE_NON_LIFTED",
  ACTIVE_LIFTED: "ACTIVE_LIFTED",
  REPLACED: "REPLACED",
  INACTIVE: "INACTIVE",
  COMPLETED: "COMPLETED",
  DEFAULTED: "DEFAULTED",
};

export class MemberChitState {
  constructor(input = {}) {
    const now = new Date().toISOString();
    this.memberId = input.memberId || input.member_id || "";
    this.groupId = input.groupId || input.group_id || "";
    this.status = input.status || MEMBER_CHIT_STATES.ACTIVE_NON_LIFTED;
    this.joinedMonth = Number(input.joinedMonth || input.joined_month || 1);
    this.liftMonth = Number(input.liftMonth || input.lift_month || 0);
    this.liftEffectiveMonth = Number(input.liftEffectiveMonth || input.lift_effective_month || 0);
    this.winnerType = input.winnerType || input.winner_type || "";
    this.replacementForMemberId = input.replacementForMemberId || input.replacement_for_member_id || "";
    this.replacedByMemberId = input.replacedByMemberId || input.replaced_by_member_id || "";
    this.totalPaid = Number(input.totalPaid || input.total_paid || 0);
    this.totalPending = Number(input.totalPending || input.total_pending || 0);
    this.totalAdvance = Number(input.totalAdvance || input.total_advance || 0);
    this.payoutStatus = input.payoutStatus || input.payout_status || "NOT_PAID";
    this.isWinnerLocked = Boolean(input.isWinnerLocked ?? input.is_winner_locked);
    this.createdAt = input.createdAt || input.created_at || now;
    this.updatedAt = input.updatedAt || input.updated_at || now;
  }

  toJSON() {
    return { ...this };
  }
}
