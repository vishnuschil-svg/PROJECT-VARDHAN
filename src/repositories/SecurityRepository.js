import { WorkspaceRepository } from "./WorkspaceRepository";

const AUDIT_LOG_KEY = "vardhan.security.auditLog.v1";
const ACTION_TRACKING_KEY = "vardhan.security.actions.v1";

export const SecurityRepository = {
  getSecuritySnapshot({ user, profile, role, permissions, modules, workspace } = {}) {
    const activeWorkspace = workspace || WorkspaceRepository.getCurrentWorkspace();

    return {
      user,
      profile,
      role,
      permissions,
      modules,
      workspace: activeWorkspace,
      auditLogs: this.listAuditLogs(activeWorkspace),
      actions: this.listActions(activeWorkspace),
    };
  },

  writeAuditLog(entry) {
    return writeScopedRecord(AUDIT_LOG_KEY, entry);
  },

  trackAction(action) {
    return writeScopedRecord(ACTION_TRACKING_KEY, action);
  },

  listAuditLogs(workspace = null) {
    return listScopedRecords(AUDIT_LOG_KEY, workspace);
  },

  listActions(workspace = null) {
    return listScopedRecords(ACTION_TRACKING_KEY, workspace);
  },
};

function writeScopedRecord(storageKey, record) {
  if (!canUseLocalStorage()) {
    return record;
  }

  const rows = readStorage(storageKey);
  const next = [record, ...rows].slice(0, 250);
  window.localStorage.setItem(storageKey, JSON.stringify(next));
  return record;
}

function listScopedRecords(storageKey, workspace) {
  if (!canUseLocalStorage()) {
    return [];
  }

  const workspaceId = workspace?.id || null;
  const tenantId = workspace?.settings?.tenantId || null;

  return readStorage(storageKey)
    .filter((item) => !workspaceId || item.workspaceId === workspaceId || item.tenantId === tenantId)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function readStorage(storageKey) {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}
