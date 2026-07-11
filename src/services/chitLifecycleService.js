import { ChitLifecycleEngine } from "../domain/chit/ChitLifecycleEngine";
import { ChitLifecycleRepository } from "../repositories/ChitLifecycleRepository";
import { formatCurrency } from "../config/chitPhaseOneData";

export function getChitLifecycle(activeTenantContext) {
  const source = ChitLifecycleRepository.getLifecycleSource(activeTenantContext);
  return ChitLifecycleEngine.buildLifecycle(source);
}

export function getChitLifecycleDashboardModel(activeTenantContext) {
  const lifecycle = getChitLifecycle(activeTenantContext);
  const completedStages = lifecycle.stageStatus.filter((stage) => stage.complete).length;

  return {
    title: "Chit Lifecycle",
    groupName: lifecycle.group?.chit_name || lifecycle.group?.name || "No active chit group",
    currentRunningMonth: lifecycle.currentRunningMonth,
    currentWinner: lifecycle.currentWinner?.memberId || "Pending",
    nextAuction: lifecycle.nextAuction?.date || "Not scheduled",
    nextAuctionGroup: lifecycle.nextAuction?.groupName || lifecycle.group?.chit_name || "",
    collectionsProgress: {
      percent: lifecycle.collectionProgress.percent,
      collected: formatCurrency(lifecycle.collectionProgress.collectedAmount),
      expected: formatCurrency(lifecycle.collectionProgress.expectedAmount),
      pending: formatCurrency(lifecycle.collectionProgress.pendingAmount),
    },
    completionPercent: lifecycle.completionPercent,
    monthClosingStatus: lifecycle.monthClosing.status,
    canCloseMonth: lifecycle.monthClosing.canClose,
    validationMessage: lifecycle.validation.errors[0] || lifecycle.validation.warnings[0] || "Lifecycle workflow is synchronized.",
    activeSlots: lifecycle.activeSlot,
    stageProgress: {
      completed: completedStages,
      total: lifecycle.stageStatus.length,
      percent: Math.round((completedStages / lifecycle.stageStatus.length) * 100),
    },
    automation: lifecycle.automation,
  };
}
