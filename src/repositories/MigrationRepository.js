import { listScopedRows, upsertScopedRow } from "./scopedStorageRepository.js";

const STORAGE_KEY = "vardhan.chit.migrationBatches.v1";

export const MigrationRepository = {
  list(activeTenantContext) {
    return listScopedRows(STORAGE_KEY, activeTenantContext);
  },
  save(batch, activeTenantContext) {
    return upsertScopedRow(STORAGE_KEY, batch, activeTenantContext, "migration-batch");
  },
};
