import { BusinessHealthRepository } from "./BusinessHealthRepository.js";

export const AIRepository = {
  getInsights(activeTenantContext) {
    return createAIPayload("INSIGHTS", activeTenantContext);
  },

  getRecommendations(activeTenantContext) {
    return createAIPayload("RECOMMENDATIONS", activeTenantContext);
  },

  getCommandSuggestions(activeTenantContext) {
    return createAIPayload("COMMAND_SUGGESTIONS", activeTenantContext);
  },

  validateBusinessData(activeTenantContext) {
    return createAIPayload("VALIDATION", activeTenantContext);
  },

  detectDuplicateData(activeTenantContext) {
    return createAIPayload("DUPLICATES", activeTenantContext);
  },

  predictBusinessHealth(activeTenantContext) {
    return createAIPayload("PREDICT_HEALTH", activeTenantContext);
  },
};

function createAIPayload(intent, activeTenantContext) {
  return {
    intent,
    activeTenantContext,
    source: BusinessHealthRepository.getSnapshot(activeTenantContext),
    provider: "mock",
  };
}
