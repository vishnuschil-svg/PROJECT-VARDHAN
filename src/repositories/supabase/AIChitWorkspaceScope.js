const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WRITE_ROLES = Object.freeze(["owner", "admin", "operator"]);

export function isUuid(value = "") {
  return UUID_PATTERN.test(String(value || ""));
}

export async function resolveAIChitWorkspaceScope({
  client,
  activeTenantContext = {},
  userId,
  requireWrite = true,
} = {}) {
  if (!client) throw new Error("Supabase client is required to resolve the business workspace.");
  if (!userId) throw new Error("An authenticated user is required to resolve the business workspace.");

  const requestedWorkspaceId = activeTenantContext.workspace_id || activeTenantContext.workspaceId || "";
  const requestedTenantId = activeTenantContext.tenant_id || activeTenantContext.tenantId || "";
  const requestedDataScope = activeTenantContext.data_scope || activeTenantContext.dataScope || "";

  if (isUuid(requestedWorkspaceId) && requestedTenantId && requestedDataScope) {
    return {
      workspace_id: requestedWorkspaceId,
      tenant_id: requestedTenantId,
      data_scope: requestedDataScope,
    };
  }

  let query = client
    .from("workspace_memberships")
    .select("workspace_id,tenant_id,data_scope,role,status")
    .eq("user_id", userId)
    .eq("status", "active");

  if (requireWrite) query = query.in("role", WRITE_ROLES);

  const { data, error } = await query.order("created_at", { ascending: true });
  if (error) {
    const wrapped = new Error(`Unable to resolve the active business workspace: ${error.message || "membership lookup failed"}`);
    wrapped.code = error.code || "WORKSPACE_RESOLUTION_FAILED";
    throw wrapped;
  }

  const rows = Array.isArray(data) ? data.filter((row) => isUuid(row?.workspace_id)) : [];
  const exact = rows.filter(
    (row) =>
      (!requestedTenantId || row.tenant_id === requestedTenantId) &&
      (!requestedDataScope || row.data_scope === requestedDataScope)
  );

  const selected = exact.length === 1
    ? exact[0]
    : exact.length === 0 && rows.length === 1
      ? rows[0]
      : null;

  if (!selected) {
    if (!rows.length) {
      throw new Error(requireWrite
        ? "No write-capable active workspace membership was found for this account."
        : "No active workspace membership was found for this account.");
    }
    throw new Error("Multiple business workspaces are available. Select the intended workspace and retry.");
  }

  return {
    workspace_id: selected.workspace_id,
    tenant_id: selected.tenant_id,
    data_scope: selected.data_scope,
  };
}

export const AI_CHIT_WRITE_ROLES = WRITE_ROLES;
