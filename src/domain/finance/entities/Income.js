export class Income {
  constructor(record = {}) {
    this.id = record.id;
    this.date = record.date || record.payment_date || record.created_at || "";
    this.category = record.category || "Income";
    this.description = record.description || record.particulars || "";
    this.amount = Number(record.amount || record.cash_in || record.bank_in || record.paid_amount || 0);
    this.paymentMode = record.payment_method || record.payment_mode || record.paymentMode || "";
    this.receiptNumber = record.receipt_no || record.receipt_number || record.receiptNumber || "";
  }
}
