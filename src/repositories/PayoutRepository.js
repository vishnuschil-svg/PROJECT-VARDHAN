import { listScopedRows, upsertScopedRow } from "./scopedStorageRepository.js";

const STORAGE_KEY = "vardhan.chit.payoutPlans.v1";

export const PayoutRepository = {
  list(activeTenantContext) {
    return listScopedRows(STORAGE_KEY, activeTenantContext);
  },
  save(plan, activeTenantContext) {
    return upsertScopedRow(STORAGE_KEY, plan, activeTenantContext, "payout");
  },
};
