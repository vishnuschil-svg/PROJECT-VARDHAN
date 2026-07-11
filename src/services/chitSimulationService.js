import { ChitSimulationEngine } from "../domain/chit/services/ChitSimulationEngine.js";

export function simulateChitPlan(input) {
  return ChitSimulationEngine.simulate(input);
}
