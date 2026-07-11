export class Installment {
  constructor(record = {}) {
    this.id = record.id;
    this.groupId = record.group_id || record.chit_group_id || record.groupId || "";
    this.memberId = record.member_id || record.memberId || "";
    this.number = Number(record.installment_month || record.installmentNumber || record.number || 0);
    this.amount = Number(record.installment_amount || record.amount || 0);
    this.paidAmount = Number(record.paid_amount || record.paidAmount || 0);
    this.pendingAmount = Number(record.pending_amount || record.pendingAmount || 0);
    this.paymentDate = record.payment_date || record.paymentDate || record.created_at || "";
  }
}
