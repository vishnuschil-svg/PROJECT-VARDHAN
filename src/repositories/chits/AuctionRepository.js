import { LocalStorageRepository } from "./LocalStorageRepository";

export const AuctionRepository = new LocalStorageRepository({
  storageKey: "vardhan.chit.auctions.v1",
  entityName: "auction",
  searchableFields: [
    "chit_group_id",
    "group_id",
    "winner_member_id",
    "status",
    "notes",
  ],
  normalize: (auction) => ({
    ...auction,
    group_id: auction.group_id || auction.chit_group_id,
    chit_group_id: auction.chit_group_id || auction.group_id,
    auction_month: Number(auction.auction_month || 0),
    bid_amount: Number(auction.bid_amount || 0),
    lift_amount: Number(auction.lift_amount || 0),
    dividend_amount: Number(auction.dividend_amount || 0),
  }),
  sort: (a, b) => new Date(b.auction_date || b.created_at || 0) - new Date(a.auction_date || a.created_at || 0),
});
