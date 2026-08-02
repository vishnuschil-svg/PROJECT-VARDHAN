import { listScopedRows, upsertScopedRow } from "./scopedStorageRepository.js";

const STORAGE_KEY = "vardhan.chit.dividends.v1";

export const DividendRepository = {
  list(activeTenantContext) {
    return listScopedRows(STORAGE_KEY, activeTenantContext);
  },
  save(dividend, activeTenantContext) {
    return upsertScopedRow(STORAGE_KEY, dividend, activeTenantContext, "dividend");
  },
};
