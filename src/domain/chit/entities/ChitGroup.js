export class ChitGroup {
  constructor(record = {}) {
    this.id = record.id;
    this.name = record.chit_name || record.name || "";
    this.code = record.chit_code || record.code || "";
    this.chitValue = Number(record.chit_value || record.chitValue || 0);
    this.monthlyAmount = Number(record.monthly_amount || record.monthlyAmount || 0);
    this.totalMembers = Number(record.total_members || record.totalMembers || 0);
    this.totalMonths = Number(record.total_months || record.totalMonths || 0);
    this.status = String(record.status || "").toLowerCase();
    this.pendingCollections = Number(record.pending_collections || record.pendingCollections || 0);
    this.todayCollections = Number(record.today_collections || record.todayCollections || 0);
    this.outstandingAmount = Number(record.outstanding_amount || record.outstandingAmount || 0);
    this.nextAuctionDate = record.next_auction_date || record.nextAuctionDate || "";
  }

  isClosed() {
    return ["closed", "archived"].includes(this.status);
  }

  isActive() {
    return this.status === "active";
  }
}
