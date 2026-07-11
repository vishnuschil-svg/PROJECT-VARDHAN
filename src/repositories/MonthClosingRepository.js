import { listScopedRows, upsertScopedRow } from "./scopedStorageRepository.js";

const STORAGE_KEY = "vardhan.chit.monthClosingSnapshots.v1";

export const MonthClosingRepository = {
  list(activeTenantContext) {
    return listScopedRows(STORAGE_KEY, activeTenantContext);
  },
  save(snapshot, activeTenantContext) {
    return upsertScopedRow(STORAGE_KEY, snapshot, activeTenantContext, "month-close");
  },
};
