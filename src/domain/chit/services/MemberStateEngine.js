import { MEMBER_CHIT_STATES, MemberChitState } from "../entities/MemberChitState.js";
import { LIFT_EFFECTIVE_RULES } from "../entities/ChitRuleSet.js";

export const MemberStateEngine = {
  buildState({ member = {}, group = {}, auctions = [], collections = [], ruleSet = {} } = {}) {
    const winningAuction = auctions.find((auction) =>
      (auction.winner_member_id || auction.winnerMemberId) === member.id &&
      (auction.group_id || auction.chit_group_id || auction.groupId) === group.id
    );
    const liftMonth = Number(winningAuction?.auction_month || winningAuction?.month || 0);
    const liftEffectiveMonth = liftMonth
      ? ruleSet.liftEffectiveRule === LIFT_EFFECTIVE_RULES.SAME_MONTH ? liftMonth : liftMonth + 1
      : 0;

    return new MemberChitState({
      memberId: member.id,
      groupId: group.id,
      status: liftMonth ? MEMBER_CHIT_STATES.ACTIVE_LIFTED : MEMBER_CHIT_STATES.ACTIVE_NON_LIFTED,
      joinedMonth: member.joined_month || 1,
      liftMonth,
      liftEffectiveMonth,
      winnerType: winningAuction?.winner_selection_mode || winningAuction?.winnerType || "",
      totalPaid: collections.reduce((sum, row) => sum + Number(row.paid_amount || row.paidAmount || 0), 0),
      totalPending: collections.reduce((sum, row) => sum + Number(row.pending_amount || row.pendingAmount || 0), 0),
      totalAdvance: collections.reduce((sum, row) => sum + Number(row.advance_amount || row.advanceAmount || 0), 0),
      isWinnerLocked: Boolean(liftMonth),
    }).toJSON();
  },

  isLiftedForMonth(memberState = {}, monthNumber = 1) {
    return Number(memberState.liftEffectiveMonth || 0) > 0 &&
      Number(monthNumber || 0) >= Number(memberState.liftEffectiveMonth || 0);
  },
};
