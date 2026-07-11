import { listScopedRows, upsertScopedRow } from "./scopedStorageRepository.js";

const STORAGE_KEY = "vardhan.chit.memberReplacements.v1";

export const MemberReplacementRepository = {
  list(activeTenantContext) {
    return listScopedRows(STORAGE_KEY, activeTenantContext);
  },
  save(replacement, activeTenantContext) {
    return upsertScopedRow(STORAGE_KEY, replacement, activeTenantContext, "member-replacement");
  },
};
