import { SupabaseRepository } from "../../lib/supabase/SupabaseRepository.js";
import {
  fromProductionDividend,
  toProductionDividend,
} from "../../services/productionChitPersistence.js";

export const DividendsRepository = new SupabaseRepository({
  tableName: "chit_dividends",
  searchableFields: ["status", "notes", "reference_no"],
  defaultSort: { column: "dividend_month", ascending: false },
  normalizeInput: (row) => toProductionDividend(row),
  normalizeOutput: (row) => fromProductionDividend(row),
});
