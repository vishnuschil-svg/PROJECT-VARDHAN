import { SupabaseRepository } from "../../lib/supabase/SupabaseRepository.js";
import {
  fromProductionLedgerEntry,
  toProductionLedgerEntry,
} from "../../services/productionChitPersistence.js";

export const LedgerRepository = new SupabaseRepository({
  tableName: "chit_ledger_entries",
  searchableFields: ["entry_type", "description", "reference_no"],
  defaultSort: { column: "entry_date", ascending: false },
  normalizeInput: (entry) => toProductionLedgerEntry(entry),
  normalizeOutput: (entry) => fromProductionLedgerEntry(entry),
});
