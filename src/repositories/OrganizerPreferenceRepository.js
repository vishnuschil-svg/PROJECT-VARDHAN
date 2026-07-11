import { listScopedRows, upsertScopedRow, deleteScopedRow } from "./scopedStorageRepository.js";

const STORAGE_KEY = "vardhan.chit.organizerPreferences.v1";

export const OrganizerPreferenceRepository = {
  list(activeTenantContext) {
    return listScopedRows(STORAGE_KEY, activeTenantContext);
  },
  save(preference, activeTenantContext) {
    return upsertScopedRow(STORAGE_KEY, preference, activeTenantContext, "organizer-preference");
  },
  forget(id, activeTenantContext) {
    return deleteScopedRow(STORAGE_KEY, id, activeTenantContext);
  },
};
