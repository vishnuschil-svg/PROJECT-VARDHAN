import { SupabaseRepository } from "../../lib/supabase/SupabaseRepository.js";
import {
  fromProductionExpense,
  toProductionExpense,
} from "../../services/productionChitPersistence.js";

export const ExpensesRepository = new SupabaseRepository({
  tableName: "expenses",
  searchableFields: ["category", "description", "paid_to", "reference_no", "status"],
  defaultSort: { column: "expense_date", ascending: false },
  normalizeInput: (row) => toProductionExpense(row),
  normalizeOutput: (row) => fromProductionExpense(row),
});
