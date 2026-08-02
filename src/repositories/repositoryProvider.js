import * as local from "./chits/index.js";
import * as supabase from "./supabase/index.js";
import { selectRepository } from "../config/repositoryBackend.js";

const names = [
  "GroupsRepository",
  "MembersRepository",
  "CollectionsRepository",
  "ReceiptsRepository",
  "FinanceRepository",
  "AuctionRepository",
  "PayoutRepository",
  "LedgerRepository",
  "WinnersRepository",
  "LuckyDrawsRepository",
];

export function createRepositoryProvider(env = import.meta.env) {
  return Object.fromEntries(
    names.map((name) => [
      name,
      selectRepository({ local: local[name], supabase: supabase[name], env }),
    ])
  );
}
