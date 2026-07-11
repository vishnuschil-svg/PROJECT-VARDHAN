import {
  AuctionRepository,
  CollectionsRepository,
  FinanceRepository,
  GroupsRepository,
  MembersRepository,
  ReceiptsRepository,
  getTenantScope,
} from "./chits";
import { WorkspaceRepository } from "./WorkspaceRepository";

const MAX_PAGE_SIZE = Number.MAX_SAFE_INTEGER;
const SAVED_REPORTS_KEY = "vardhan.enterprise.savedReports.v1";
const REPORT_SCHEDULES_KEY = "vardhan.enterprise.reportSchedules.v1";

export const ReportsRepository = {
  getReportSource(activeTenantContext) {
    const tenantContext = activeTenantContext || WorkspaceRepository.getCurrentWorkspaceContext();
    const workspace = WorkspaceRepository.getCurrentWorkspace();

    return {
      workspace,
      tenantContext,
      groups: listRepositoryRows(GroupsRepository, tenantContext),
      members: listRepositoryRows(MembersRepository, tenantContext),
      collections: listRepositoryRows(CollectionsRepository, tenantContext),
      receipts: listRepositoryRows(ReceiptsRepository, tenantContext),
      financeEntries: listRepositoryRows(FinanceRepository, tenantContext),
      auctions: listRepositoryRows(AuctionRepository, tenantContext),
      savedReports: this.listSavedReports(tenantContext),
      schedules: this.listSchedules(tenantContext),
    };
  },

  listSavedReports(activeTenantContext) {
    return listScopedStorage(SAVED_REPORTS_KEY, activeTenantContext);
  },

  saveReport(report, activeTenantContext) {
    return upsertScopedStorage(SAVED_REPORTS_KEY, report, activeTenantContext, "saved-report");
  },

  listSchedules(activeTenantContext) {
    return listScopedStorage(REPORT_SCHEDULES_KEY, activeTenantContext);
  },

  saveSchedule(schedule, activeTenantContext) {
    return upsertScopedStorage(REPORT_SCHEDULES_KEY, schedule, activeTenantContext, "report-schedule");
  },
};

function listRepositoryRows(repository, activeTenantContext) {
  if (!getTenantScope(activeTenantContext).scope_key) {
    return [];
  }

  return repository.list({
    activeTenantContext,
    pageSize: MAX_PAGE_SIZE,
  }).data;
}

function listScopedStorage(storageKey, activeTenantContext) {
  const scope = getTenantScope(activeTenantContext);

  if (!scope.scope_key || !canUseLocalStorage()) {
    return [];
  }

  return readStorage(storageKey)
    .filter((item) => item.scope_key === scope.scope_key)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
}

function upsertScopedStorage(storageKey, record, activeTenantContext, prefix) {
  const scope = getTenantScope(activeTenantContext);

  if (!scope.scope_key) {
    return null;
  }

  const now = new Date().toISOString();
  const nextRecord = {
    ...record,
    id: record.id || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tenant_id: scope.tenant_id,
    data_scope: scope.data_scope,
    scope_key: scope.scope_key,
    createdAt: record.createdAt || now,
    updatedAt: now,
  };
  const existing = readStorage(storageKey);
  const next = [
    nextRecord,
    ...existing.filter(
      (item) => !(item.id === nextRecord.id && item.scope_key === nextRecord.scope_key)
    ),
  ];

  writeStorage(storageKey, next);
  return nextRecord;
}

function readStorage(storageKey) {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(storageKey, rows) {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(storageKey, JSON.stringify(rows));
  }
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}
