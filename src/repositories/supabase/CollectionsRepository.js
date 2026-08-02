import { SupabaseRepository } from "../../lib/supabase/SupabaseRepository.js";
import {
  fromProductionCollection,
  toProductionCollection,
} from "../../services/productionChitPersistence.js";

export const CollectionsRepository = new SupabaseRepository({
  tableName: "chit_collections",
  searchableFields: [
    "receipt_no",
    "member_id",
    "group_id",
    "collection_month",
    "payment_method",
    "collected_by",
    "notes",
  ],
  defaultSort: { column: "collection_date", ascending: false },
  normalizeInput: (collection) => toProductionCollection(collection),
  normalizeOutput: (collection) => fromProductionCollection(collection),
});
