import { listScopedRows, upsertScopedRow } from "./scopedStorageRepository.js";

const STORAGE_KEY = "vardhan.chit.manualOverrides.v1";

export const OverrideRepository = {
  list(activeTenantContext) {
    return listScopedRows(STORAGE_KEY, activeTenantContext);
  },
  save(override, activeTenantContext) {
    return upsertScopedRow(STORAGE_KEY, override, activeTenantContext, "override");
  },
};
