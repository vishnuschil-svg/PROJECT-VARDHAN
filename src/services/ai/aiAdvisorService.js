import { vardhanAIEngine } from "../../ai/AIEngine.js";
import { AIRepository } from "../../repositories/AIRepository.js";
import { buildAIContext } from "./aiEngineService.js";

export function getAIAdvisorInsights(activeTenantContext) {
  const payload = AIRepository.getInsights(activeTenantContext);
  const context = buildAIContext(activeTenantContext, payload);

  return vardhanAIEngine.generateBusinessInsights(context);
}

export function getAIRecommendations(activeTenantContext) {
  const payload = AIRepository.getRecommendations(activeTenantContext);
  const context = buildAIContext(activeTenantContext, payload);

  return vardhanAIEngine.execute({ type: "RECOMMENDATIONS", context });
}

export function validateAIBusinessData(activeTenantContext) {
  const payload = AIRepository.validateBusinessData(activeTenantContext);
  const context = buildAIContext(activeTenantContext, payload);

  return vardhanAIEngine.execute({ type: "VALIDATION", context });
}

export function detectAIDuplicateData(activeTenantContext) {
  const payload = AIRepository.detectDuplicateData(activeTenantContext);
  const context = buildAIContext(activeTenantContext, payload);

  return vardhanAIEngine.execute({ type: "DUPLICATES", context });
}

export function predictAIBusinessHealth(activeTenantContext) {
  const payload = AIRepository.predictBusinessHealth(activeTenantContext);
  const context = buildAIContext(activeTenantContext, payload);

  return vardhanAIEngine.execute({ type: "PREDICT_HEALTH", context })[0];
}

export function detectAIBusinessAnomalies(activeTenantContext) {
  const payload = AIRepository.getInsights(activeTenantContext);
  const context = buildAIContext(activeTenantContext, payload);

  return vardhanAIEngine.detectBusinessAnomalies(context);
}
