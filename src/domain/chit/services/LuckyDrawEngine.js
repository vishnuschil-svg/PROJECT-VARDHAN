import { WINNER_MODES } from "../entities/WinnerResult.js";
import { WinnerStateEngine } from "./WinnerStateEngine.js";
import { assertRegisteredOperationEnabled } from "../../../config/groupManagerSafety.js";

export const LuckyDrawEngine = {
  selectWinner({ eligibleMembers = [], deterministicSeed = "", featureFlags } = {}) {
    assertRegisteredOperationEnabled("AUTOMATED_LUCKY_DRAW", featureFlags);
    if (!eligibleMembers.length) return null;
    const index = deterministicSeed
      ? Math.abs(hash(deterministicSeed)) % eligibleMembers.length
      : Math.floor(Math.random() * eligibleMembers.length);
    return {
      winner: eligibleMembers[index],
      winnerIndex: index,
      randomValue: deterministicSeed || String(Date.now()),
    };
  },

  buildResult({ group = {}, scheduleRow = {}, member = {}, selection = {}, activeTenantContext = {}, userId = "local-user", featureFlags } = {}) {
    assertRegisteredOperationEnabled("AUTOMATED_WINNER_SELECTION", featureFlags);
    return WinnerStateEngine.buildWinner({
      tenantId: activeTenantContext.tenant_id,
      workspaceId: activeTenantContext.workspace_id || activeTenantContext.workspaceId || "",
      groupId: group.id,
      monthNumber: scheduleRow.monthNumber || selection.monthNumber || 1,
      memberId: member.id,
      winnerMode: WINNER_MODES.LUCKY_DRAW,
      prizeAmount: scheduleRow.prizeAmount || scheduleRow.payoutAmount || 0,
      payoutAmount: scheduleRow.payoutAmount || scheduleRow.prizeAmount || 0,
      dividend: scheduleRow.dividendPerMember || 0,
      commission: scheduleRow.commissionAmount || 0,
      organizerProfit: scheduleRow.organizerProfit || 0,
      status: "CONFIRMED",
      confirmedBy: userId,
      confirmedAt: new Date().toISOString(),
    }, featureFlags);
  },
};

function hash(value) {
  return String(value).split("").reduce((total, char) => ((total << 5) - total) + char.charCodeAt(0), 0);
}
