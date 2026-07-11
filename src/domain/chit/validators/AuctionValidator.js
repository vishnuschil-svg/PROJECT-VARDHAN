import { createValidation } from "./ChitValidator.js";

export const AuctionValidator = {
  validateAuction({ auction = {}, group = {}, scheduleRow = null, ruleSet = null, member = null, bidPreview = null, existingWinners = [], monthClosed = false } = {}) {
    const errors = [];
    const warnings = [];
    const month = Number(auction.auction_month || auction.month || 0);
    const totalMonths = Number(group.total_months || group.totalMonths || 0);

    if (!month || month < 1 || month > totalMonths) {
      errors.push("Invalid auction month.");
    }
    if (Number(auction.bid_amount || auction.bidAmount || 0) < 0) {
      errors.push("Auction bid cannot be negative.");
    }
    if (["closed", "archived"].includes(String(group.status || "").toLowerCase())) {
      errors.push("Cannot run auction after chit closure.");
    }
    if (scheduleRow !== null && !scheduleRow?.monthNumber) errors.push("Missing schedule row.");
    if (ruleSet !== null && !ruleSet?.paymentPatternType) errors.push("Missing rule set.");
    if (member !== null && !member?.id) errors.push("Winner member is required.");
    if (member?.id && String(member.status || "active").toLowerCase() !== "active") errors.push("Inactive member cannot win.");
    if (monthClosed) errors.push("Cannot run auction in a closed month.");
    if (existingWinners.some((winner) =>
      winner.groupId === group?.id &&
      Number(winner.monthNumber) === Number(scheduleRow?.monthNumber || month) &&
      String(winner.status || "").toUpperCase() !== "CANCELLED"
    )) errors.push("Duplicate auction or winner for this month.");
    if (bidPreview && !bidPreview.bidValidation?.isValid) errors.push(bidPreview.bidValidation?.message || "Invalid bid.");
    if (Number(bidPreview?.payoutAmount || 0) < 0) errors.push("Invalid payout.");
    if (Number(bidPreview?.commission || 0) < 0) errors.push("Invalid commission.");
    if (Number(bidPreview?.dividend || 0) < 0) errors.push("Invalid dividend.");
    if (scheduleRow?.isManuallyOverridden && !scheduleRow?.isUserConfirmed) warnings.push("Manual override must be confirmed before final save.");

    return createValidation(errors, warnings);
  },
};
