export class Commission {
  constructor(record = {}) {
    this.id = record.id;
    this.date = record.date || record.auction_date || record.created_at || "";
    this.sourceId = record.source_id || record.auction_id || record.id || "";
    this.amount = Number(record.amount || record.commission || 0);
    this.rate = Number(record.rate || record.commission_rate || 0);
    this.status = record.status || "Calculated";
  }
}
