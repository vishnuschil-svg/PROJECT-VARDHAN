import { CalculationExplainEngine } from "../domain/chit/services/CalculationExplainEngine.js";

export const AIExplainEngine = {
  explainPayable(resolution) {
    return CalculationExplainEngine.explainPayable(resolution);
  },
};
