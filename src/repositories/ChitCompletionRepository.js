import { listScopedRows, upsertScopedRow } from "./scopedStorageRepository.js";

const STORAGE_KEY = "vardhan.chit.completionSnapshots.v1";

export const ChitCompletionRepository = {
  list(activeTenantContext) {
    return listScopedRows(STORAGE_KEY, activeTenantContext);
  },
  save(snapshot, activeTenantContext) {
    return upsertScopedRow(STORAGE_KEY, snapshot, activeTenantContext, "completion");
  },
};
