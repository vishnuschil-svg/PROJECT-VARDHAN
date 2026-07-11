export const AuditLogger = {
  createEntry({ action, actor, workspace, module, metadata = {} } = {}) {
    return {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      action: action || "UNKNOWN_ACTION",
      actorId: actor?.id || actor?.email || "system",
      actorName: actor?.name || actor?.full_name || actor?.email || "System",
      workspaceId: workspace?.id || null,
      tenantId: workspace?.settings?.tenantId || workspace?.tenant_id || null,
      module: module || workspace?.module || "PLATFORM",
      metadata,
      createdAt: new Date().toISOString(),
    };
  },
};
