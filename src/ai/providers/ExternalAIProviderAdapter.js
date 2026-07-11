export const ExternalAIProviderAdapter = {
  name: "EXTERNAL_AI_PROVIDER_ADAPTER",
  isConfigured() {
    return false;
  },
  async execute() {
    throw new Error("External AI provider is not connected. Configure a provider adapter outside the frontend before use.");
  },
};
