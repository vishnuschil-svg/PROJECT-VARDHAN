export class Batch {
  constructor(input = {}) {
    const now = new Date().toISOString();
    this.id = input.id || `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.tenantId = input.tenantId || input.tenant_id || "";
    this.workspaceId = input.workspaceId || input.workspace_id || "";
    this.name = input.name || "New Batch";
    this.code = input.code || `BATCH-${Date.now()}`;
    this.description = input.description || "";
    this.status = input.status || "ACTIVE";
    this.startDate = input.startDate || input.start_date || "";
    this.endDate = input.endDate || input.end_date || "";
    this.groupIds = input.groupIds || input.group_ids || [];
    this.createdBy = input.createdBy || input.created_by || "local-owner";
    this.createdAt = input.createdAt || input.created_at || now;
    this.updatedAt = input.updatedAt || input.updated_at || now;
  }

  toJSON() {
    return { ...this };
  }
}
