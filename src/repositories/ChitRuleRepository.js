import { listScopedRows, upsertScopedRow } from "./scopedStorageRepository.js";

const STORAGE_KEY = "vardhan.chit.ruleSets.v1";

export const ChitRuleRepository = {
  list(activeTenantContext) {
    return listScopedRows(STORAGE_KEY, activeTenantContext);
  },
  getByGroup(groupId, activeTenantContext) {
    return this.list(activeTenantContext).find((row) => row.groupId === groupId || row.group_id === groupId) || null;
  },
  save(ruleSet, activeTenantContext) {
    return upsertScopedRow(STORAGE_KEY, ruleSet, activeTenantContext, "rule-set");
  },
};
