export function resolveInitialWorkspace({ workspaces = [], persistedId = "", activeAuthWorkspace = null } = {}) {
  const preferredTenantId = activeAuthWorkspace?.tenant_id || activeAuthWorkspace?.tenantId;
  return workspaces.find((workspace) => workspace.id === persistedId)
    || workspaces.find((workspace) => workspace.settings?.tenantId === preferredTenantId)
    || workspaces[0]
    || null;
}
