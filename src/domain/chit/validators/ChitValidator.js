import { ChitGroup } from "../entities/ChitGroup.js";

export const ChitValidator = {
  validateGroup(groupRecord, members = []) {
    const group = new ChitGroup(groupRecord);
    const errors = [];

    if (!group.name) errors.push("Chit group name is required.");
    if (group.chitValue <= 0) errors.push("Chit value must be greater than zero.");
    if (group.monthlyAmount <= 0) errors.push("Monthly amount must be greater than zero.");
    if (group.totalMembers <= 0) errors.push("Member capacity must be greater than zero.");
    if (members.length > group.totalMembers) errors.push("Member capacity exceeded.");

    return createValidation(errors);
  },

  canCollect(groupRecord) {
    const group = new ChitGroup(groupRecord);
    return createValidation(group.isClosed() ? ["Cannot collect after chit closure."] : []);
  },
};

export function createValidation(errors = [], warnings = []) {
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
