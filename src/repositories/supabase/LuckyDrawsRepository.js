import { SupabaseRepository } from "../../lib/supabase/SupabaseRepository.js";
import {
  fromProductionLuckyDraw,
  toProductionLuckyDraw,
} from "../../services/productionChitPersistence.js";

export const LuckyDrawsRepository = new SupabaseRepository({
  tableName: "lucky_draws",
  searchableFields: ["status", "notes"],
  defaultSort: { column: "draw_month", ascending: false },
  normalizeInput: (draw) => toProductionLuckyDraw(draw),
  normalizeOutput: (draw) => fromProductionLuckyDraw(draw),
});
