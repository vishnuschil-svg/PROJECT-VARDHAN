import { listScopedRows, upsertScopedRow, deleteScopedRow } from "./scopedStorageRepository.js";

const STORAGE_KEY = "vardhan.chit.scheduleRows.v1";

export const ChitScheduleRepository = {
  list(activeTenantContext) {
    return listScopedRows(STORAGE_KEY, activeTenantContext);
  },
  listByGroup(groupId, activeTenantContext) {
    return this.list(activeTenantContext).filter((row) => row.groupId === groupId || row.group_id === groupId);
  },
  save(row, activeTenantContext) {
    return upsertScopedRow(STORAGE_KEY, row, activeTenantContext, "schedule-row");
  },
  saveMany(rows = [], activeTenantContext) {
    return rows.map((row) => this.save(row, activeTenantContext));
  },
  delete(id, activeTenantContext) {
    return deleteScopedRow(STORAGE_KEY, id, activeTenantContext);
  },
};
