import { listScopedRows, upsertScopedRow } from "./scopedStorageRepository.js";

const STORAGE_KEY = "vardhan.chit.memberStates.v1";

export const MemberStateRepository = {
  list(activeTenantContext) {
    return listScopedRows(STORAGE_KEY, activeTenantContext);
  },
  get(memberId, groupId, activeTenantContext) {
    return this.list(activeTenantContext).find((state) =>
      (state.memberId || state.member_id) === memberId &&
      (state.groupId || state.group_id) === groupId
    ) || null;
  },
  save(state, activeTenantContext) {
    return upsertScopedRow(STORAGE_KEY, state, activeTenantContext, "member-state");
  },
};
