import { listScopedRows, upsertScopedRow } from "./scopedStorageRepository.js";

const STORAGE_KEY = "vardhan.chit.batches.v1";

export const BatchRepository = {
  list(activeTenantContext) {
    return listScopedRows(STORAGE_KEY, activeTenantContext);
  },
  save(batch, activeTenantContext) {
    return upsertScopedRow(STORAGE_KEY, batch, activeTenantContext, "batch");
  },
  archive(id, activeTenantContext) {
    const batch = this.list(activeTenantContext).find((item) => item.id === id);
    return batch ? this.save({ ...batch, status: "ARCHIVED" }, activeTenantContext) : null;
  },
};
