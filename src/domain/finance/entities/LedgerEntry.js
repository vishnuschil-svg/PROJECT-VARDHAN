export class LedgerEntry {
  constructor(record = {}) {
    this.id = record.id;
    this.date = record.date || record.payment_date || record.created_at || "";
    this.account = record.account || record.category || record.particulars || "General Ledger";
    this.debit = Number(record.debit || record.cash_out || record.bank_out || 0);
    this.credit = Number(record.credit || record.cash_in || record.bank_in || record.amount || 0);
    this.balance = Number(record.balance || 0);
    this.reference = record.receipt_no || record.voucher_no || record.receipt_number || "";
  }
}
