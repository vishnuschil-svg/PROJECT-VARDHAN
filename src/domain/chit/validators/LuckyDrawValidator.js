import { createValidation } from "./ChitValidator.js";

export const LuckyDrawValidator = {
  validateDraw({ group = {}, scheduleRow = {}, eligibleMembers = [], existingWinners = [], monthClosed = false } = {}) {
    const errors = [];
    const monthNumber = Number(scheduleRow.monthNumber || 0);

    if (!group?.id) errors.push("Missing group.");
    if (group?.id && String(group.status || "").toLowerCase() !== "active") errors.push("Inactive group.");
    if (!monthNumber) errors.push("Missing schedule row.");
    if (monthClosed) errors.push("Cannot draw in a closed month.");
    if (!eligibleMembers.length) errors.push("No eligible members available.");
    if (existingWinners.some((winner) =>
      winner.groupId === group.id &&
      Number(winner.monthNumber) === monthNumber &&
      String(winner.status || "").toUpperCase() !== "CANCELLED"
    )) errors.push("Duplicate month winner is not allowed.");

    return createValidation(errors);
  },
};
