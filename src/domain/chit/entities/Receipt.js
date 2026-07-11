export class Receipt {
  constructor(record = {}) {
    this.id = record.id;
    this.receiptNumber = record.receipt_number || record.receiptNumber || "";
    this.collectionId = record.collection_id || record.collectionId || "";
    this.groupId = record.group_id || record.groupId || "";
    this.memberId = record.member_id || record.memberId || "";
    this.amount = Number(record.amount || record.amountPaid || 0);
    this.paymentDate = record.payment_date || record.paymentDate || "";
  }
}
