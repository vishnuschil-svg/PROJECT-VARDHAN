export const MemberStatus = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  OVERDUE: "overdue",
  CLOSED: "closed",
  REMOVED: "removed",
};

export function isActiveMemberStatus(status) {
  return String(status || "").toLowerCase() === MemberStatus.ACTIVE;
}
