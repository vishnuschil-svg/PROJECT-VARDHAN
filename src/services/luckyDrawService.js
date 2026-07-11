import { LuckyDrawEngine } from "../domain/chit/services/LuckyDrawEngine.js";
import { WinnerEligibilityEngine } from "../domain/chit/services/WinnerEligibilityEngine.js";
import { LuckyDrawValidator } from "../domain/chit/validators/LuckyDrawValidator.js";
import { ChitRuleRepository } from "../repositories/ChitRuleRepository.js";
import { ChitScheduleRepository } from "../repositories/ChitScheduleRepository.js";
import { LuckyDrawRepository } from "../repositories/LuckyDrawRepository.js";
import { AuctionRepository } from "../repositories/AuctionRepository.js";
import { listWinnerResults, confirmWinnerResult } from "./winnerService.js";

export function listLuckyDrawResults(activeTenantContext) {
  return LuckyDrawRepository.list(activeTenantContext);
}

export function buildLuckyDrawPreview({ activeTenantContext, group, members = [], monthNumber = 1, deterministicSeed = "" } = {}) {
  const scheduleRow = ChitScheduleRepository.listByGroup(group?.id, activeTenantContext).find((row) => Number(row.monthNumber) === Number(monthNumber)) ||
    { monthNumber, winnerSelectionMode: "LUCKY_DRAW", prizeAmount: group?.chit_value || 0, payoutAmount: group?.chit_value || 0 };
  const ruleSet = ChitRuleRepository.getByGroup(group?.id, activeTenantContext) || { paymentPatternType: "FIXED", liftEffectiveRule: "NEXT_MONTH", winnerLockRule: "ONCE_LIFTED_LOCKED" };
  const winners = listWinnerResults(activeTenantContext);
  const eligibleMembers = WinnerEligibilityEngine.getEligibleMembers({ members, group, auctions: AuctionRepository.list(activeTenantContext), winnerHistory: winners, ruleSet });
  const validation = LuckyDrawValidator.validateDraw({ group, scheduleRow, eligibleMembers, existingWinners: winners });
  const selection = validation.isValid ? LuckyDrawEngine.selectWinner({ eligibleMembers, deterministicSeed }) : null;
  return { scheduleRow, ruleSet, eligibleMembers, validation, selection };
}

export function confirmLuckyDrawWinner({ activeTenantContext, group, members = [], monthNumber = 1, deterministicSeed = "", userId = "local-user" } = {}) {
  const built = buildLuckyDrawPreview({ activeTenantContext, group, members, monthNumber, deterministicSeed });
  if (!built.validation.isValid) return { success: false, ...built, message: built.validation.errors[0] };
  const winner = LuckyDrawEngine.buildResult({ group, scheduleRow: built.scheduleRow, member: built.selection.winner, selection: built.selection, activeTenantContext, userId });
  const savedDraw = LuckyDrawRepository.save({
    ...winner,
    draw_number: `LD-${Date.now()}`,
    random_value: built.selection.randomValue,
    winner_index: built.selection.winnerIndex,
  }, activeTenantContext);
  const confirmed = confirmWinnerResult({ winner, ruleSet: built.ruleSet, activeTenantContext, userId, memberName: built.selection.winner.member_name, groupName: group.chit_name });
  return { success: true, draw: savedDraw, ...confirmed, ...built, message: "Lucky draw winner confirmed and downstream records updated." };
}
