import { listScopedRows, upsertScopedRow } from "./scopedStorageRepository.js";

const STORAGE_KEY = "vardhan.chit.captureResults.v1";

export const CaptureRepository = {
  list(activeTenantContext) {
    return listScopedRows(STORAGE_KEY, activeTenantContext);
  },
  save(capture, activeTenantContext) {
    return upsertScopedRow(STORAGE_KEY, capture, activeTenantContext, "capture");
  },
};
