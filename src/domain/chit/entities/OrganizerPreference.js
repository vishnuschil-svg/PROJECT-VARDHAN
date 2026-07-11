export class OrganizerPreference {
  constructor(input = {}) {
    this.tenantId = input.tenantId || input.tenant_id || "";
    this.workspaceId = input.workspaceId || input.workspace_id || "";
    this.key = input.key || "";
    this.value = input.value ?? "";
    this.confidence = Number(input.confidence || 0.7);
    this.source = input.source || "CONFIRMED_TEMPLATE";
    this.confirmedBy = input.confirmedBy || input.confirmed_by || "";
    this.confirmedAt = input.confirmedAt || input.confirmed_at || new Date().toISOString();
    this.version = Number(input.version || 1);
  }

  toJSON() {
    return { ...this };
  }
}
