import { listScopedRows, upsertScopedRow } from "./scopedStorageRepository.js";

const STORAGE_KEY = "vardhan.chit.winnerResults.v1";

export const WinnerRepository = {
  list(activeTenantContext) {
    return listScopedRows(STORAGE_KEY, activeTenantContext);
  },
  save(winner, activeTenantContext) {
    return upsertScopedRow(STORAGE_KEY, winner, activeTenantContext, "winner");
  },
};
