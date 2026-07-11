export class Investor {
  constructor(input = {}) {
    const now = new Date().toISOString();
    this.id = input.id || `investor-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.tenantId = input.tenantId || input.tenant_id || "";
    this.workspaceId = input.workspaceId || input.workspace_id || "";
    this.name = input.name || "Investor";
    this.mobile = input.mobile || "";
    this.email = input.email || "";
    this.address = input.address || "";
    this.taxReference = input.taxReference || input.tax_reference || "";
    this.status = input.status || "ACTIVE";
    this.notes = input.notes || "";
    this.createdAt = input.createdAt || input.created_at || now;
    this.updatedAt = input.updatedAt || input.updated_at || now;
  }

  toJSON() {
    return { ...this };
  }
}

export const INVESTOR_TRANSACTION_TYPES = {
  INVESTMENT: "INVESTMENT",
  ADDITIONAL_FUNDING: "ADDITIONAL_FUNDING",
  PROFIT_SHARE: "PROFIT_SHARE",
  REPAYMENT: "REPAYMENT",
  WITHDRAWAL: "WITHDRAWAL",
  ADJUSTMENT: "ADJUSTMENT",
};
