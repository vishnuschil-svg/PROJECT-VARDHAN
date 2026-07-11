export class ChitTemplate {
  constructor(input = {}) {
    const now = new Date().toISOString();
    this.id = input.id || `template-${Date.now()}`;
    this.tenantId = input.tenantId || input.tenant_id || "";
    this.workspaceId = input.workspaceId || input.workspace_id || "";
    this.name = input.name || "Untitled Chit Template";
    this.description = input.description || "";
    this.category = input.category || "CUSTOM";
    this.ruleSet = input.ruleSet || input.rule_set || {};
    this.schedule = input.schedule || [];
    this.sourceType = input.sourceType || input.source_type || "MANUAL";
    this.sourceDocumentId = input.sourceDocumentId || input.source_document_id || "";
    this.language = input.language || "en";
    this.tags = input.tags || [];
    this.version = Number(input.version || 1);
    this.status = input.status || "DRAFT";
    this.usageCount = Number(input.usageCount || input.usage_count || 0);
    this.lastUsedAt = input.lastUsedAt || input.last_used_at || "";
    this.createdBy = input.createdBy || input.created_by || "";
    this.createdAt = input.createdAt || input.created_at || now;
    this.updatedAt = input.updatedAt || input.updated_at || now;
  }

  toJSON() {
    return { ...this };
  }
}
