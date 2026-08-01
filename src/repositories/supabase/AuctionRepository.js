import { SupabaseRepository } from "../../lib/supabase/SupabaseRepository.js";
export const AuctionRepository = new SupabaseRepository({ tableName: "chit_auctions", searchableFields: ["status", "notes"] });
