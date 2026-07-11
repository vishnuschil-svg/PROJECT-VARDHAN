export class Collection {
  constructor(record = {}) {
    this.id = record.id;
    this.groupId = record.group_id || record.chit_group_id || record.groupId || "";
    this.memberId = record.member_id || record.memberId || "";
    this.installmentNumber = Number(record.installment_month || record.installmentNumber || 0);
    this.installmentAmount = Number(record.installment_amount || record.installmentAmount || 0);
    this.paidAmount = Number(record.paid_amount || record.paidAmount || 0);
    this.pendingAmount = Number(record.pending_amount || record.pendingAmount || 0);
    this.paymentMode = record.payment_method || record.paymentMode || "";
    this.paymentDate = record.payment_date || record.paymentDate || record.created_at || "";
    this.receiptNumber = record.receipt_number || record.receiptNumber || "";
    this.status = String(record.status || "").toLowerCase();
  }
}
