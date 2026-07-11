export class Expense {
  constructor(record = {}) {
    this.id = record.id;
    this.date = record.date || record.created_at || "";
    this.category = record.category || "Operating Expense";
    this.description = record.description || record.particulars || "";
    this.amount = Number(record.amount || record.cash_out || record.bank_out || 0);
    this.paymentMode = record.payment_mode || record.paymentMode || "";
    this.status = record.status || "Posted";
  }
}
