import { SupabaseRepository } from "../../lib/supabase/SupabaseRepository.js";
import {
  fromProductionAuction,
  toProductionAuction,
} from "../../services/productionChitPersistence.js";

export const AuctionRepository = new SupabaseRepository({
  tableName: "chit_auctions",
  searchableFields: ["status", "notes"],
  defaultSort: { column: "auction_month", ascending: false },
  normalizeInput: (auction) => toProductionAuction(auction),
  normalizeOutput: (auction) => fromProductionAuction(auction),
});
