import { SupabaseRepository } from "../../lib/supabase/SupabaseRepository.js";
import {
  fromProductionFinanceEntry,
  toProductionFinanceEntry,
} from "../../services/productionChitPersistence.js";

export const FinanceRepository = new SupabaseRepository({
  tableName: "chit_finance_entries",
  searchableFields: [
    "entry_type",
    "category",
    "particulars",
    "description",
    "payment_mode",
    "status",
    "receipt_no",
  ],
  defaultSort: { column: "entry_date", ascending: false },
  normalizeInput: (entry) => toProductionFinanceEntry(entry),
  normalizeOutput: (entry) => fromProductionFinanceEntry(entry),
});
