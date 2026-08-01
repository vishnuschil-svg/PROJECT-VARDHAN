import { getSupabaseClient } from "../lib/supabase/SupabaseClient.js";

export async function fetchEnterpriseHealth(workspaceId, { apiBaseUrl = import.meta.env.VITE_PLATFORM_API_URL || "", fetchImpl = globalThis.fetch } = {}) {
  const client = getSupabaseClient();
  const session = client ? (await client.auth.getSession()).data.session : null;
  if (!session?.access_token || !workspaceId) throw new Error("Authenticated workspace context is required for production health checks.");
  const response = await fetchImpl(`${String(apiBaseUrl).replace(/\/$/, "")}/v1/health/enterprise`, {
    headers: { Authorization: `Bearer ${session.access_token}`, "X-Workspace-Id": workspaceId },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.detail || `Health check failed with ${response.status}.`);
  return result;
}
