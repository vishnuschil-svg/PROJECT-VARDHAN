export const ExternalOCRProviderAdapter = {
  name: "EXTERNAL_OCR_PROVIDER_ADAPTER",
  isConfigured() {
    return false;
  },
  async extract() {
    throw new Error("External OCR provider is not connected. Manual capture mode is active.");
  },
};
