import { ChitCalculationEngine } from "./ChitCalculationEngine.js";

export const DividendEngine = {
  calculateDividend(discount, commission, totalMembers) {
    return ChitCalculationEngine.calculateDividend(
      Math.max(0, Number(discount || 0) - Number(commission || 0)),
      totalMembers
    );
  },
};
