import { ChitCalculationEngine } from "./ChitCalculationEngine.js";

export const DividendEngine = {
  calculateDividend(discount, commission, totalMembers) {
    return ChitCalculationEngine.calculateDividend(
      Math.max(0, Number(discount || 0) - Number(commission || 0)),
      totalMembers
    );
  },

  calculatePool(discount = 0, commission = 0) {
    return Math.max(0, Number(discount || 0) - Number(commission || 0));
  },

  /**
   * Floor-rupee allocation with remainder assigned to the first eligible member
   * so the posted total always equals the dividend pool.
   */
  allocateMonthDividends({
    discount = 0,
    commission = 0,
    members = [],
    winnerMemberId = null,
    excludeWinner = true,
  } = {}) {
    const pool = this.calculatePool(discount, commission);
    const eligible = (members || []).filter((member) => {
      if (!member?.id) return false;
      if (excludeWinner && winnerMemberId && String(member.id) === String(winnerMemberId)) {
        return false;
      }
      return String(member.status || "active").toLowerCase() !== "inactive";
    });

    if (!eligible.length) {
      return {
        pool,
        perMember: 0,
        allocations: [],
        rounding: {
          method: "floor_rupee_with_remainder_to_first",
          basePerMember: 0,
          remainderAssigned: pool,
          winnerExcluded: Boolean(excludeWinner && winnerMemberId),
        },
      };
    }

    const basePerMember = Math.floor(pool / eligible.length);
    const remainder = pool - basePerMember * eligible.length;
    const allocations = eligible.map((member, index) => ({
      member_id: member.id,
      amount: basePerMember + (index === 0 ? remainder : 0),
      winner_excluded: false,
      notes: index === 0 && remainder ? `Base ${basePerMember} + remainder ${remainder}` : null,
    }));

    return {
      pool,
      perMember: basePerMember,
      allocations,
      rounding: {
        method: "floor_rupee_with_remainder_to_first",
        basePerMember,
        remainderAssigned: remainder,
        eligibleCount: eligible.length,
        winnerExcluded: Boolean(excludeWinner && winnerMemberId),
        winnerMemberId: winnerMemberId || null,
      },
    };
  },
};
