import { createAIContext, AI_DOMAINS } from "../../ai/AIContext.js";
import { vardhanAIEngine } from "../../ai/AIEngine.js";
import { AIRepository } from "../../repositories/AIRepository.js";
import { getBusinessHealth } from "../businessHealthService.js";
import { getAIInsights } from "../aiInsightsService.js";

export function buildAIContext(activeTenantContext, payload = {}) {
  return createAIContext({
    domain: AI_DOMAINS.CHIT,
    activeTenantContext,
    source: {
      ...payload.source,
      health: getBusinessHealth(activeTenantContext),
      insights: getAIInsights(activeTenantContext),
    },
    metadata: {
      intent: payload.intent,
      repositoryProvider: payload.provider,
    },
  });
}

export function executeAIRequest({ type, commandText = "", activeTenantContext } = {}) {
  const payload = AIRepository.getInsights(activeTenantContext);
  const context = buildAIContext(activeTenantContext, payload);

  return vardhanAIEngine.execute({ type, commandText, context });
}

export function executeAICommand(commandText, activeTenantContext) {
  const payload = AIRepository.getCommandSuggestions(activeTenantContext);
  const context = buildAIContext(activeTenantContext, payload);

  return vardhanAIEngine.executeCommand(commandText, context);
}

export function getAIInsightsFromEngine(activeTenantContext) {
  const payload = AIRepository.getInsights(activeTenantContext);
  const context = buildAIContext(activeTenantContext, payload);

  return vardhanAIEngine.generateBusinessInsights(context);
}

export function getAIReportSuggestions(activeTenantContext) {
  const payload = AIRepository.getInsights(activeTenantContext);
  const context = buildAIContext(activeTenantContext, payload);

  return vardhanAIEngine.createReportSuggestions(context);
}

export function getAINotificationSuggestions(activeTenantContext) {
  const payload = AIRepository.getInsights(activeTenantContext);
  const context = buildAIContext(activeTenantContext, payload);

  return vardhanAIEngine.createNotificationSuggestions(context);
}

export function getAIFutureCapabilities(activeTenantContext) {
  const payload = AIRepository.getInsights(activeTenantContext);
  const context = buildAIContext(activeTenantContext, payload);

  return {
    ocr: vardhanAIEngine.supportFutureOCR(context),
    voice: vardhanAIEngine.supportFutureVoiceCommands(context),
  };
}
