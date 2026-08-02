import { SupabaseRepository } from "../../lib/supabase/SupabaseRepository.js";
import {
  fromProductionWinner,
  toProductionWinner,
} from "../../services/productionChitPersistence.js";

export const WinnersRepository = new SupabaseRepository({
  tableName: "chit_winners",
  searchableFields: ["status", "winner_mode", "confirmed_by"],
  defaultSort: { column: "month_number", ascending: false },
  normalizeInput: (winner) => toProductionWinner(winner),
  normalizeOutput: (winner) => fromProductionWinner(winner),
});
