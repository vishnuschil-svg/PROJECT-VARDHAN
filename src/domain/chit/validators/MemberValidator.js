import { createValidation } from "./ChitValidator.js";

export const MemberValidator = {
  validateMember(member = {}, group = null, existingMembers = []) {
    const errors = [];
    const groupMembers = existingMembers.filter(
      (item) => (item.group_id || item.chit_group_id || item.groupId) === (group?.id || member.group_id || member.groupId)
    );

    if (!member.member_name && !member.name) errors.push("Member name is required.");
    if (!member.mobile_number && !member.mobile) errors.push("Member mobile is required.");
    if (group && groupMembers.length >= Number(group.total_members || group.totalMembers || 0)) {
      errors.push("Member capacity exceeded.");
    }

    return createValidation(errors);
  },
};
