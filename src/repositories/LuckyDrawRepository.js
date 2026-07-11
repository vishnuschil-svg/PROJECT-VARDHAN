import { listScopedRows, upsertScopedRow } from "./scopedStorageRepository.js";

const STORAGE_KEY = "vardhan.chit.luckyDrawResults.v1";

export const LuckyDrawRepository = {
  list(activeTenantContext) {
    return listScopedRows(STORAGE_KEY, activeTenantContext);
  },
  save(record, activeTenantContext) {
    return upsertScopedRow(STORAGE_KEY, record, activeTenantContext, "lucky-draw");
  },
};
