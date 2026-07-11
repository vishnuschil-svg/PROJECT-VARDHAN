export const AI_DOMAINS = {
  CHIT: "MITRA_NIDHI_CHITI_PRO",
  PLATFORM: "VARDHAN_ERP_PLATFORM",
};

export function createAIContext({
  domain = AI_DOMAINS.PLATFORM,
  activeTenantContext = null,
  source = {},
  metadata = {},
} = {}) {
  return {
    domain,
    activeTenantContext,
    source: {
      groups: source.groups || [],
      members: source.members || [],
      collections: source.collections || [],
      financeEntries: source.financeEntries || [],
      health: source.health || null,
      insights: source.insights || [],
      recommendations: source.recommendations || [],
    },
    metadata: {
      createdAt: new Date().toISOString(),
      providerMode: "mock",
      supportsOCR: false,
      supportsVoice: false,
      ...metadata,
    },
  };
}

export function createAssistantResponse({
  id,
  type,
  title,
  message,
  action = null,
  confidence = 0.75,
  severity = "info",
}) {
  return {
    id,
    type,
    title,
    message,
    action,
    confidence,
    severity,
  };
}
