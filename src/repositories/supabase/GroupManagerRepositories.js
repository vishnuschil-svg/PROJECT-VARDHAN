import { SupabaseRepository } from "../../lib/supabase/SupabaseRepository.js";

export const ManualBidRecordsRepository = createRepository("manual_bid_records", ["period_id", "reference_number", "notes"]);
export const DistributionRecordsRepository = createRepository("distribution_records", ["period_id", "reference_number", "notes"]);

function createRepository(tableName, searchableFields) {
  return new SupabaseRepository({
    tableName,
    searchableFields,
    defaultSort: { column: "created_at", ascending: false },
  });
}
