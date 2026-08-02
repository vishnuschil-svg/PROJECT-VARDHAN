import { SupabaseRepository } from "../../lib/supabase/SupabaseRepository.js";
import {
  fromProductionCompletion,
  toProductionCompletion,
} from "../../services/productionChitPersistence.js";

export const CompletionsRepository = new SupabaseRepository({
  tableName: "chit_completions",
  searchableFields: ["status", "notes", "completed_by"],
  defaultSort: { column: "completed_at", ascending: false },
  normalizeInput: (row) => toProductionCompletion(row),
  normalizeOutput: (row) => fromProductionCompletion(row),
});
