export class Member {
  constructor(record = {}) {
    this.id = record.id;
    this.name = record.member_name || record.name || "";
    this.memberNumber = record.member_number || record.memberNumber || "";
    this.mobile = record.mobile_number || record.mobile || "";
    this.groupId = record.group_id || record.chit_group_id || record.groupId || "";
    this.status = String(record.status || "active").toLowerCase();
  }

  isActive() {
    return this.status === "active";
  }
}
