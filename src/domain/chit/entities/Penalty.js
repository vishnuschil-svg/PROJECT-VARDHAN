export class Penalty {
  constructor(record = {}) {
    this.id = record.id;
    this.groupId = record.group_id || record.groupId || "";
    this.memberId = record.member_id || record.memberId || "";
    this.amount = Number(record.amount || record.fine_amount || 0);
    this.reason = record.reason || "Late payment";
    this.createdAt = record.created_at || record.createdAt || "";
  }
}
