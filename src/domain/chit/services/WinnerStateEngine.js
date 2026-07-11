import { LIFT_EFFECTIVE_RULES } from "../entities/ChitRuleSet.js";
import { WinnerResult, WINNER_STATUS } from "../entities/WinnerResult.js";

export const WinnerStateEngine = {
  buildWinner(input = {}) {
    return new WinnerResult(input).toJSON();
  },

  confirmWinner(winner, ruleSet = {}, userId = "local-user") {
    const confirmed = new WinnerResult(winner).confirm(userId);
    return {
      winner: confirmed,
      memberStatePatch: {
        member_id: confirmed.memberId,
        group_id: confirmed.groupId,
        status: "ACTIVE_LIFTED",
        lift_month: confirmed.monthNumber,
        lift_effective_month: ruleSet.liftEffectiveRule === LIFT_EFFECTIVE_RULES.SAME_MONTH
          ? confirmed.monthNumber
          : confirmed.monthNumber + 1,
        winner_type: confirmed.winnerMode,
        is_winner_locked: true,
        updated_at: confirmed.confirmedAt,
      },
    };
  },

  cancelWinner(winner, { userId, reason } = {}) {
    return new WinnerResult(winner).cancel({ userId, reason });
  },

  isActiveWinner(winner) {
    return String(winner.status || "").toUpperCase() === WINNER_STATUS.CONFIRMED ||
      String(winner.status || "").toUpperCase() === WINNER_STATUS.PROVISIONAL;
  },
};
