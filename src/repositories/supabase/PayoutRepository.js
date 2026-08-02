import { SupabaseRepository } from "../../lib/supabase/SupabaseRepository.js";
import {
  fromProductionPayout,
  toProductionPayout,
} from "../../services/productionChitPersistence.js";

export const PayoutRepository = new SupabaseRepository({
  tableName: "chit_payouts",
  searchableFields: ["status", "payment_method", "reference_no", "notes"],
  defaultSort: { column: "payout_month", ascending: false },
  normalizeInput: (plan) => toProductionPayout(plan),
  normalizeOutput: (plan) => fromProductionPayout(plan),
});
