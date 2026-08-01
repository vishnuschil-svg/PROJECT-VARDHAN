import { SupabaseRepository } from "../../lib/supabase/SupabaseRepository.js";
export const LedgerRepository = new SupabaseRepository({ tableName: "chit_ledger_entries", searchableFields: ["entry_type", "description", "reference_no"] });
