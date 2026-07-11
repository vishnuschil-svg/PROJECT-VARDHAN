import { getTenantScope } from "./chits/index.js";
import { WorkspaceRepository } from "./WorkspaceRepository.js";

export function listScopedRows(storageKey, activeTenantContext) {
  const scope = getTenantScope(activeTenantContext || WorkspaceRepository.getCurrentWorkspaceContext());
  if (!scope.scope_key || !canUseLocalStorage()) return [];
  return readRows(storageKey).filter((row) => row.scope_key === scope.scope_key);
}

export function upsertScopedRow(storageKey, row, activeTenantContext, prefix) {
  const scope = getTenantScope(activeTenantContext || WorkspaceRepository.getCurrentWorkspaceContext());
  if (!scope.scope_key) throw new Error("Tenant and data scope are required.");
  const now = new Date().toISOString();
  const record = {
    ...row,
    id: row.id || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tenant_id: scope.tenant_id,
    data_scope: scope.data_scope,
    scope_key: scope.scope_key,
    created_at: row.created_at || now,
    updated_at: now,
  };
  const rows = readRows(storageKey);
  writeRows(storageKey, [record, ...rows.filter((item) => !(item.id === record.id && item.scope_key === record.scope_key))]);
  return record;
}

export function deleteScopedRow(storageKey, id, activeTenantContext) {
  const scope = getTenantScope(activeTenantContext || WorkspaceRepository.getCurrentWorkspaceContext());
  const rows = readRows(storageKey);
  writeRows(storageKey, rows.filter((row) => !(row.id === id && row.scope_key === scope.scope_key)));
}

function readRows(storageKey) {
  if (!canUseLocalStorage()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRows(storageKey, rows) {
  if (canUseLocalStorage()) window.localStorage.setItem(storageKey, JSON.stringify(rows));
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}
