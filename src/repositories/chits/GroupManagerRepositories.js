import { LocalStorageRepository } from "./LocalStorageRepository.js";

export const ManualBidRecordsRepository = createRepository("manual-bid-records", "manual-bid-record", ["group_id", "period_id", "declared_recipient_member_id", "reference_number"]);
export const DistributionRecordsRepository = createRepository("distribution-records", "distribution-record", ["group_id", "period_id", "recipient_member_id", "reference_number"]);

function createRepository(key, entityName, searchableFields) {
  return new LocalStorageRepository({
    storageKey: `vardhan.group-manager.${key}.v1`,
    entityName,
    searchableFields,
  });
}
