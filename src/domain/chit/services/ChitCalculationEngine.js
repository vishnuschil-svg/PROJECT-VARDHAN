export const ChitCalculationEngine = {
  calculatePrizeAmount(chitValue, discount = 0, commission = 0) {
    return Math.max(0, Number(chitValue || 0) - Number(discount || 0) - Number(commission || 0));
  },

  calculateDiscount(chitValue, bidAmount) {
    return Math.max(0, Number(chitValue || 0) - Number(bidAmount || 0));
  },

  calculateCommission(chitValue, commissionRate = 5) {
    return Math.round((Number(chitValue || 0) * Number(commissionRate || 0)) / 100);
  },

  calculateDividend(discount, totalMembers) {
    if (!Number(totalMembers || 0)) return 0;
    return Math.floor(Number(discount || 0) / Number(totalMembers || 1));
  },

  calculatePending(expectedAmount, paidAmount) {
    return Math.max(0, Number(expectedAmount || 0) - Number(paidAmount || 0));
  },

  calculateRunningBalance(openingBalance = 0, debit = 0, credit = 0) {
    return Number(openingBalance || 0) + Number(debit || 0) - Number(credit || 0);
  },

  toPercent(value, total) {
    if (!Number(total || 0)) return 0;
    return Math.round((Number(value || 0) / Number(total || 0)) * 100);
  },
};
