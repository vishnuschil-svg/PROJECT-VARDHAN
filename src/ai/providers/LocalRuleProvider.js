import { ScheduleEngine } from "../../domain/chit/services/ScheduleEngine.js";
import { RuleEngine } from "../../domain/chit/services/RuleEngine.js";

export const LocalRuleProvider = {
  name: "LOCAL_RULE_PROVIDER",
  designProposals(input = {}) {
    return ["SAFE", "BALANCED", "GROWTH"].map((risk) => {
      const multiplier = risk === "SAFE" ? 1 : risk === "BALANCED" ? 1.05 : 1.1;
      const standardPayment = Math.round((Number(input.chitValue || 0) / Number(input.members || 1)) * multiplier);
      const schedule = ScheduleEngine.generateRows({
        totalMonths: input.duration,
        standardPayment,
        nonLiftedPayment: standardPayment,
        liftedPayment: input.liftedPayment || standardPayment,
        chitValue: input.chitValue,
        commission: input.commissionValue || 5,
        winnerSelectionMode: input.luckyDrawRequired ? "LUCKY_DRAW" : "AUCTION",
        confidence: "MEDIUM",
        sourceType: "LOCAL_AI_PROPOSAL",
      });
      return {
        id: `proposal-${risk.toLowerCase()}`,
        name: `${risk[0]}${risk.slice(1).toLowerCase()} Plan`,
        risk,
        ruleSet: RuleEngine.createDefault({
          paymentPatternType: input.fixedPayment === false ? "MONTH_WISE_VARIABLE" : "FIXED",
          auctionEnabled: Boolean(input.auctionRequired),
          luckyDrawEnabled: Boolean(input.luckyDrawRequired),
          hybridEnabled: Boolean(input.hybridRequired),
          commissionType: input.commissionType || "PERCENTAGE",
          commissionValue: input.commissionValue || 5,
        }),
        schedule,
        assumptions: ["Generated locally from owner-entered values.", "Owner confirmation is required before activation."],
        riskWarnings: risk === "GROWTH" ? ["Higher collection pressure in growth plan."] : [],
      };
    });
  },
};
