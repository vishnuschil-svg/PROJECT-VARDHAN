import { ChitSimulationEngine } from "../domain/chit/services/ChitSimulationEngine.js";

export const AIChitSimulator = {
  simulate(input) {
    return ChitSimulationEngine.simulate(input);
  },
};
