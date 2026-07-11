export const PenaltyEngine = {
  calculatePenalty({ pendingAmount = 0, daysOverdue = 0, dailyRate = 0.1 } = {}) {
    if (Number(pendingAmount || 0) <= 0 || Number(daysOverdue || 0) <= 0) {
      return 0;
    }

    return Math.round((Number(pendingAmount) * Number(dailyRate) * Number(daysOverdue)) / 100);
  },
};
