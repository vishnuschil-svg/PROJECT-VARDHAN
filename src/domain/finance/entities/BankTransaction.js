export class BankTransaction {
  constructor(record = {}) {
    this.id = record.id;
    this.date = record.date || record.payment_date || record.created_at || "";
    this.bankName = record.bank_name || record.bankName || "Operating Bank";
    this.accountNumber = record.account_number || record.accountNumber || "";
    this.bankIn = Number(record.bank_in || record.bankIn || 0);
    this.bankOut = Number(record.bank_out || record.bankOut || 0);
    this.balance = Number(record.balance || 0);
    this.paymentMode = record.payment_mode || record.paymentMode || "bank";
  }
}
