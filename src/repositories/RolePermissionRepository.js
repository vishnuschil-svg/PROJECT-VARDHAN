import { listScopedRows, upsertScopedRow } from "./scopedStorageRepository.js";

const ROLE_KEY = "vardhan.chit.customRoles.v1";

export const RolePermissionRepository = {
  list(activeTenantContext) {
    return listScopedRows(ROLE_KEY, activeTenantContext);
  },
  save(role, activeTenantContext) {
    return upsertScopedRow(ROLE_KEY, role, activeTenantContext, "custom-role");
  },
};
