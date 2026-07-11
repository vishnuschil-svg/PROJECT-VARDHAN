export class Auction {
  constructor(record = {}) {
    this.id = record.id;
    this.groupId = record.group_id || record.chit_group_id || record.groupId || "";
    this.month = Number(record.auction_month || record.month || 0);
    this.winnerMemberId = record.winner_member_id || record.winnerMemberId || "";
    this.bidAmount = Number(record.bid_amount || record.bidAmount || 0);
    this.liftAmount = Number(record.lift_amount || record.liftAmount || 0);
    this.dividendAmount = Number(record.dividend_amount || record.dividendAmount || 0);
    this.status = String(record.status || "scheduled").toLowerCase();
    this.auctionDate = record.auction_date || record.auctionDate || "";
  }
}
