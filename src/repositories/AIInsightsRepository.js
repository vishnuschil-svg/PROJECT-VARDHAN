import { BusinessHealthRepository } from "./BusinessHealthRepository.js";

export const AIInsightsRepository = {
  getSnapshot(activeTenantContext) {
    return BusinessHealthRepository.getSnapshot(activeTenantContext);
  },
};
