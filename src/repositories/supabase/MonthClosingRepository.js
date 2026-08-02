import { SupabaseRepository } from "../../lib/supabase/SupabaseRepository.js";
import {
  fromProductionMonthClosing,
  toProductionMonthClosing,
} from "../../services/productionChitPersistence.js";

export const MonthClosingRepository = new SupabaseRepository({
  tableName: "month_closing",
  searchableFields: ["status", "notes", "reopen_reason"],
  defaultSort: { column: "closing_month", ascending: false },
  normalizeInput: (row) => toProductionMonthClosing(row),
  normalizeOutput: (row) => fromProductionMonthClosing(row),
});
