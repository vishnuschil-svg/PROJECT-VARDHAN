import { createAIContext, createAssistantResponse } from "./AIContext.js";
import { executeCommand, getCommandSuggestions } from "./AICommandCenter.js";
import { validateAIRequest, validateBusinessData } from "./AIValidator.js";
import { detectBusinessAnomalies, detectDuplicateData } from "./AIErrorDetector.js";
import { generateBusinessInsights, getRecommendations, predictBusinessHealth } from "./AIAdvisor.js";
import { createNotificationSuggestions, createReportSuggestions } from "./AIReports.js";
import { createOCRPlaceholder, createVoiceCommandPlaceholder } from "./AIImport.js";

export class AIEngine {
  constructor({ provider = createMockAIProvider() } = {}) {
    this.providers = new Map();
    this.activeProviderName = "";
    this.registerProvider(provider.name, provider);
  }

  registerProvider(name, provider) {
    if (!name || !provider) {
      throw new Error("AI provider name and implementation are required.");
    }

    this.providers.set(name, provider);
    this.activeProviderName = this.activeProviderName || name;
    return this;
  }

  setActiveProvider(name) {
    if (!this.providers.has(name)) {
      throw new Error(`AI provider "${name}" is not registered.`);
    }

    this.activeProviderName = name;
    return this;
  }

  execute(request = {}) {
    const context = request.context || createAIContext();
    const validation = validateAIRequest({ ...request, context });

    if (!validation.valid) {
      return validation.errors.map((message, index) =>
        createAssistantResponse({
          id: `ai-request-error-${index + 1}`,
          type: "AI_REQUEST_ERROR",
          title: "AI request rejected",
          message,
          action: null,
          confidence: 1,
          severity: "critical",
        })
      );
    }

    return this.getActiveProvider().execute(request, context);
  }

  executeCommand(commandText, context) {
    return this.execute({ type: "COMMAND", commandText, context })[0];
  }

  generateBusinessInsights(context) {
    return this.execute({ type: "INSIGHTS", context });
  }

  detectBusinessAnomalies(context) {
    return this.execute({ type: "ANOMALIES", context });
  }

  createReportSuggestions(context) {
    return this.execute({ type: "REPORTS", context });
  }

  createNotificationSuggestions(context) {
    return this.execute({ type: "NOTIFICATIONS", context });
  }

  supportFutureOCR(context) {
    return this.execute({ type: "OCR", context })[0];
  }

  supportFutureVoiceCommands(context) {
    return this.execute({ type: "VOICE", context })[0];
  }

  getActiveProvider() {
    return this.providers.get(this.activeProviderName);
  }
}

export function createMockAIProvider() {
  return {
    name: "mock-vardhan-ai-provider",
    execute(request, context) {
      switch (request.type) {
        case "COMMAND":
          return [executeCommand(request.commandText)];
        case "COMMAND_SUGGESTIONS":
          return getCommandSuggestions(context);
        case "INSIGHTS":
          return generateBusinessInsights(context);
        case "RECOMMENDATIONS":
          return getRecommendations(context);
        case "VALIDATION":
          return validateBusinessData(context);
        case "DUPLICATES":
          return detectDuplicateData(context);
        case "PREDICT_HEALTH":
          return [predictBusinessHealth(context)];
        case "ANOMALIES":
          return detectBusinessAnomalies(context);
        case "REPORTS":
          return createReportSuggestions(context);
        case "NOTIFICATIONS":
          return createNotificationSuggestions(context);
        case "OCR":
          return [createOCRPlaceholder(context)];
        case "VOICE":
          return [createVoiceCommandPlaceholder(context)];
        default:
          return [
            createAssistantResponse({
              id: "mock-provider-fallback",
              type: "AI_RESPONSE",
              title: "Mock AI provider ready",
              message: "The VARDHAN AI Foundation is active with no external AI connection.",
              action: { label: "Open dashboard", route: "/dashboard" },
              confidence: 0.72,
              severity: "info",
            }),
          ];
      }
    },
  };
}

export const vardhanAIEngine = new AIEngine();
