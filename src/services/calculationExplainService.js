import { CalculationExplainEngine } from "../domain/chit/services/CalculationExplainEngine.js";

export function explainPayableResolution(resolution) {
  return CalculationExplainEngine.explainPayable(resolution);
}

export function explainValue(input) {
  return CalculationExplainEngine.explainValue(input);
}
