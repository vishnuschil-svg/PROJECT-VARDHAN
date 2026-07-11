export const EXPENSE_CATEGORIES = [
  "SALARY",
  "RENT",
  "ELECTRICITY",
  "PRINTING",
  "MARKETING",
  "TRAVEL",
  "OFFICE",
  "COMMUNICATION",
  "PROFESSIONAL_FEES",
  "MISCELLANEOUS",
  "CUSTOM",
];

export class Expense {
  constructor(input = {}) {
    const now = new Date().toISOString();
    this.id = input.id || `expense-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.tenantId = input.tenantId || input.tenant_id || "";
    this.workspaceId = input.workspaceId || input.workspace_id || "";
    this.batchId = input.batchId || input.batch_id || "";
    this.groupId = input.groupId || input.group_id || "";
    this.category = input.category || "MISCELLANEOUS";
    this.amount = Number(input.amount || 0);
    this.paymentMode = input.paymentMode || input.payment_mode || "CASH";
    this.date = input.date || now.slice(0, 10);
    this.vendor = input.vendor || "";
    this.reference = input.reference || "";
    this.notes = input.notes || "";
    this.attachmentMetadata = input.attachmentMetadata || input.attachment_metadata || {};
    this.createdBy = input.createdBy || input.created_by || "local-owner";
    this.approvedBy = input.approvedBy || input.approved_by || "";
    this.status = input.status || "POSTED";
    this.createdAt = input.createdAt || input.created_at || now;
    this.updatedAt = input.updatedAt || input.updated_at || now;
  }

  toJSON() {
    return { ...this };
  }
}
