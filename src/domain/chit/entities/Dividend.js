export class Dividend {
  constructor(record = {}) {
    this.id = record.id;
    this.groupId = record.group_id || record.groupId || "";
    this.auctionId = record.auction_id || record.auctionId || "";
    this.memberId = record.member_id || record.memberId || "";
    this.amount = Number(record.amount || record.dividend_amount || 0);
    this.month = Number(record.month || record.auction_month || 0);
  }
}
