import {
  AuctionRepository,
  CollectionsRepository,
  FinanceRepository,
  GroupsRepository,
  MembersRepository,
  ReceiptsRepository,
  ReportsRepository,
} from "../repositories/chits";

export const ChitDataService = {
  groups: GroupsRepository,
  members: MembersRepository,
  collections: CollectionsRepository,
  receipts: ReceiptsRepository,
  finance: FinanceRepository,
  auctions: AuctionRepository,
  reports: ReportsRepository,
};

export function getChitRepository(name) {
  return ChitDataService[name] || null;
}
