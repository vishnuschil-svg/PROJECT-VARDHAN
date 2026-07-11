import { LocalStorageRepository } from "./LocalStorageRepository.js";

export const GroupsRepository = new LocalStorageRepository({
  storageKey: "vardhan.chit.groups.v1",
  entityName: "group",
  searchableFields: ["chit_name", "chit_code", "status"],
  normalize: (group) => ({
    ...group,
    chit_value: Number(group.chit_value || 0),
    monthly_amount: Number(group.monthly_amount || 0),
    total_members: Number(group.total_members || 0),
    total_months: Number(group.total_months || 0),
    today_collections: Number(group.today_collections || 0),
    pending_collections: Number(group.pending_collections || 0),
    outstanding_amount: Number(group.outstanding_amount || 0),
  }),
});
