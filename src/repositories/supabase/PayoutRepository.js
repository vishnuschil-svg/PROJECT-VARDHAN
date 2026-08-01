import { SupabaseRepository } from "../../lib/supabase/SupabaseRepository.js";
export const PayoutRepository = new SupabaseRepository({ tableName: "chit_payouts", searchableFields: ["status", "payment_method", "reference_no"] });
