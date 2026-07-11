export class CashTransaction {
  constructor(record = {}) {
    this.id = record.id;
    this.date = record.date || record.payment_date || record.created_at || "";
    this.particulars = record.particulars || record.description || record.category || "Cash transaction";
    this.cashIn = Number(record.cash_in || record.cashIn || 0);
    this.cashOut = Number(record.cash_out || record.cashOut || 0);
    this.balance = Number(record.balance || 0);
    this.status = record.status || "Posted";
  }
}
