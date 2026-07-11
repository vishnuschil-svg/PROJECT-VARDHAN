import { ChitRuleSet } from "../entities/ChitRuleSet.js";

export const RuleEngine = {
  createDefault(input = {}) {
    return new ChitRuleSet(input).toJSON();
  },

  resolveCommission({ amount = 0, ruleSet = {}, scheduleRow = {} } = {}) {
    const type = scheduleRow.commissionType || ruleSet.commissionType || "PERCENTAGE";
    const value = Number(scheduleRow.commissionValue ?? ruleSet.commissionValue ?? 0);
    if (type === "FIXED_AMOUNT") return value;
    if (type === "PERCENTAGE") return Math.round((Number(amount || 0) * value) / 100);
    return Number(scheduleRow.commissionAmount || 0);
  },

  isBidWithinLimits({ bidAmount = 0, chitValue = 0, ruleSet = {} } = {}) {
    const bid = Number(bidAmount || 0);
    const min = resolveBidValue(ruleSet.minimumBidType, ruleSet.minimumBidValue, chitValue);
    const max = resolveBidValue(ruleSet.maximumBidType, ruleSet.maximumBidValue, chitValue);
    return {
      isValid: bid >= min && bid <= max,
      min,
      max,
      message: bid < min || bid > max ? `Bid must be between ${min} and ${max}.` : "Bid is within configured limits.",
    };
  },

  canMemberWin({ memberState = {}, ruleSet = {} } = {}) {
    if (ruleSet.winnerLockRule === "ONCE_LIFTED_LOCKED" && memberState.isWinnerLocked) {
      return { eligible: false, reason: "Member already lifted and is locked from future winner selection." };
    }
    return { eligible: true, reason: "Member is eligible under current winner rules." };
  },
};

function resolveBidValue(type, value, chitValue) {
  if (type === "PERCENTAGE") return Math.round((Number(chitValue || 0) * Number(value || 0)) / 100);
  return Number(value || 0);
}
