export const LOCAL_AI_PROVIDER_NAME = "local-vardhan-ai";

export function createLocalAIProvider() {
  return {
    name: LOCAL_AI_PROVIDER_NAME,
    capabilities: {
      llm: "local-rules",
      ocr: "manual-fallback",
      vision: "manual-fallback",
    },
    async extractChitPattern({ file, manualText = "" } = {}) {
      const sourceText = manualText || file?.name || "";
      return {
        provider: LOCAL_AI_PROVIDER_NAME,
        mode: "LOCAL_MANUAL_FALLBACK",
        message: "External OCR/vision provider is not configured. Review and correct captured fields before creating a draft.",
        fields: extractFieldsFromText(sourceText),
      };
    },
  };
}

function extractFieldsFromText(text) {
  const value = findAmount(text, /(chit\s*value|value|amount)[:\s-]*([₹rs.,\d]+)/i);
  const members = findNumber(text, /(members|member\s*count)[:\s-]*(\d+)/i);
  const duration = findNumber(text, /(duration|months)[:\s-]*(\d+)/i);
  const monthlyPayment = findAmount(text, /(monthly|installment|payment)[:\s-]*([₹rs.,\d]+)/i);
  const commission = findNumber(text, /(commission)[:\s-]*(\d+)/i);

  return {
    chitName: withConfidence(findText(text, /(chit\s*name|name)[:\s-]*([a-z0-9\s-]+)/i) || "", 0.45),
    chitValue: withConfidence(value, value ? 0.66 : 0.2),
    memberCount: withConfidence(members, members ? 0.66 : 0.2),
    duration: withConfidence(duration, duration ? 0.66 : 0.2),
    monthlyPayment: withConfidence(monthlyPayment, monthlyPayment ? 0.66 : 0.2),
    prizeAmount: withConfidence(findAmount(text, /(prize)[:\s-]*([₹rs.,\d]+)/i), 0.35),
    commission: withConfidence(commission || 5, commission ? 0.66 : 0.35),
    organiserDetails: withConfidence(findText(text, /(organiser|organizer)[:\s-]*([a-z0-9\s-]+)/i) || "", 0.35),
    contactDetails: withConfidence(findText(text, /(contact|mobile|phone)[:\s-]*([+\d\s-]+)/i) || "", 0.35),
    monthWisePattern: withConfidence([], 0.25),
    liftedAmounts: withConfidence([], 0.25),
    nonLiftedAmounts: withConfidence([], 0.25),
  };
}

function withConfidence(value, confidence) {
  return { value, confidence };
}

function findText(text, pattern) {
  return String(text || "").match(pattern)?.[2]?.trim() || "";
}

function findNumber(text, pattern) {
  const value = findText(text, pattern);
  return value ? Number(value.replace(/\D/g, "")) : 0;
}

function findAmount(text, pattern) {
  const value = findText(text, pattern);
  return value ? Number(value.replace(/[^\d]/g, "")) : 0;
}
