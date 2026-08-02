import { SupabaseRepository } from "../../lib/supabase/SupabaseRepository.js";
import {
  fromProductionReceipt,
  toProductionReceipt,
} from "../../services/productionChitPersistence.js";

export const ReceiptsRepository = new SupabaseRepository({
  tableName: "chit_receipts",
  searchableFields: [
    "receipt_no",
    "collection_id",
    "member_id",
    "group_id",
    "payment_method",
    "notes",
  ],
  defaultSort: { column: "payment_date", ascending: false },
  normalizeInput: (receipt) => toProductionReceipt(receipt),
  normalizeOutput: (receipt) => fromProductionReceipt(receipt),
});
