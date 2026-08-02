import { LuckyDrawEngine } from "../domain/chit/services/LuckyDrawEngine.js";
import { WinnerEligibilityEngine } from "../domain/chit/services/WinnerEligibilityEngine.js";
import { LuckyDrawValidator } from "../domain/chit/validators/LuckyDrawValidator.js";
import { ChitRuleRepository } from "../repositories/ChitRuleRepository.js";
import { ChitScheduleRepository } from "../repositories/ChitScheduleRepository.js";
import { listWinnerResults, confirmWinnerResult } from "./winnerService.js";
import {
  listAuctionsPersistent,
  listLuckyDrawsPersistent,
} from "./winnerLifecyclePersistence.js";

export async function listLuckyDrawResults(activeTenantContext) {
  return listLuckyDrawsPersistent(activeTenantContext);
}

export async function buildLuckyDrawPreview({
  activeTenantContext,
  group,
  members = [],
  monthNumber = 1,
  deterministicSeed = "",
} = {}) {
  const scheduleRow =
    ChitScheduleRepository.listByGroup(group?.id, activeTenantContext).find(
      (row) => Number(row.monthNumber) === Number(monthNumber)
    ) || {
      monthNumber,
      winnerSelectionMode: "LUCKY_DRAW",
      prizeAmount: group?.chit_value || 0,
      payoutAmount: group?.chit_value || 0,
    };
  const ruleSet = ChitRuleRepository.getByGroup(group?.id, activeTenantContext) || {
    paymentPatternType: "FIXED",
    liftEffectiveRule: "NEXT_MONTH",
    winnerLockRule: "ONCE_LIFTED_LOCKED",
  };
  const [winners, auctions] = await Promise.all([
    listWinnerResults(activeTenantContext),
    listAuctionsPersistent(activeTenantContext),
  ]);
  const eligibleMembers = WinnerEligibilityEngine.getEligibleMembers({
    members,
    group,
    auctions,
    winnerHistory: winners,
    ruleSet,
  });
  const validation = LuckyDrawValidator.validateDraw({
    group,
    scheduleRow,
    eligibleMembers,
    existingWinners: winners,
  });
  const selection = validation.isValid
    ? LuckyDrawEngine.selectWinner({ eligibleMembers, deterministicSeed })
    : null;
  return { scheduleRow, ruleSet, eligibleMembers, validation, selection, winners };
}

export async function confirmLuckyDrawWinner({
  activeTenantContext,
  group,
  members = [],
  monthNumber = 1,
  deterministicSeed = "",
  userId = "local-user",
  permissions = {},
  profile = {},
  role = "",
} = {}) {
  const built = await buildLuckyDrawPreview({
    activeTenantContext,
    group,
    members,
    monthNumber,
    deterministicSeed,
  });
  if (!built.validation.isValid) {
    return { success: false, ...built, message: built.validation.errors[0] };
  }

  const winner = LuckyDrawEngine.buildResult({
    group,
    scheduleRow: built.scheduleRow,
    member: built.selection.winner,
    selection: built.selection,
    activeTenantContext,
    userId,
  });

  const confirmed = await confirmWinnerResult({
    winner,
    ruleSet: built.ruleSet,
    activeTenantContext,
    userId,
    memberName: built.selection.winner.member_name,
    groupName: group.chit_name,
    eventType: "LUCKY_DRAW",
    permissions,
    profile,
    role,
    eventExtras: {
      idempotency_key: `lucky-draw:${group.id}:${monthNumber}:${built.selection.winner.id}:${built.selection.randomValue}`,
      random_value: built.selection.randomValue,
      winner_index: built.selection.winnerIndex,
      deterministic_seed: deterministicSeed,
      participants: built.eligibleMembers.map((item) => item.id),
      event_metadata: {
        draw_number: `LD-${Date.now()}`,
      },
    },
  });

  if (!confirmed.success) {
    return { success: false, ...built, message: confirmed.message };
  }

  const savedDraw =
    confirmed.draw || {
      ...winner,
      draw_number: `LD-${Date.now()}`,
      random_value: built.selection.randomValue,
      winner_index: built.selection.winnerIndex,
      status: "CONFIRMED",
    };

  return {
    success: true,
    draw: savedDraw,
    ...confirmed,
    ...built,
    message: confirmed.message || "Lucky draw winner confirmed and downstream records updated.",
  };
}
