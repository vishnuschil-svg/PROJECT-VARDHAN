const CLEANUP_VERSION_KEY = "vardhan.internalTrial.businessDataCleanup.v1";

const BUSINESS_DATA_KEYS = [
  "vardhan.chit.groups.v1",
  "vardhan.chit.members.v1",
  "vardhan.chit.sharedCollections.v1",
  "vardhan.chit.receipts.v1",
  "vardhan.chit.auctions.v1",
  "vardhan.chit.finance.v1",
  "vardhan.chit.reports.v1",
  "vardhan.chit.luckyDrawResults.v1",
  "vardhan.chit.winnerResults.v1",
  "vardhan.chit.payoutPlans.v1",
  "vardhan.chit.expenses.v1",
  "vardhan.chit.investors.v1",
  "vardhan.chit.investorTransactions.v1",
  "vardhan.chit.batches.v1",
  "vardhan.chit.scheduleRows.v1",
  "vardhan.chit.memberStates.v1",
  "vardhan.chit.memberReplacements.v1",
  "vardhan.chit.migrationBatches.v1",
  "vardhan.chit.monthClosingSnapshots.v1",
  "vardhan.chit.completionSnapshots.v1",
  "vardhan.chit.captureResults.v1",
  "vardhan.chit.manualOverrides.v1",
  "vardhan.dashboard.activities.v1",
  "vardhan.dashboard.notifications.custom.v1",
  "vardhan.dashboard.notifications.read.v1",
  "vardhan.ai.chitDrafts.v1",
  "vardhan.import.sessions.v1",
  "vardhan.enterprise.savedReports.v1",
  "vardhan.enterprise.reportSchedules.v1",
  "vardhan.finance.ledger.v1",
];

export const PRESERVED_INSTALL_KEYS = [
  "vardhan.demo.auth.session.v1",
  "vardhan.workspace.active.v1",
  "vardhan.chit.paymentSettings.v1",
  "vardhan.chit.ruleSets.v1",
  "vardhan.chit.templates.v1",
  "vardhan.chit.messageTemplates.v1",
  "vardhan.chit.organizerPreferences.v1",
  "vardhan.chit.customRoles.v1",
  "vardhan.security.auditLog.v1",
  "vardhan.security.actions.v1",
  "vardhan.data.offlineQueue.v1",
];

export function runInternalTrialBusinessDataCleanup() {
  if (typeof window === "undefined" || !window.localStorage) {
    return { ran: false, removedKeys: [], preservedKeys: PRESERVED_INSTALL_KEYS };
  }

  if (window.localStorage.getItem(CLEANUP_VERSION_KEY) === "done") {
    return { ran: false, removedKeys: [], preservedKeys: PRESERVED_INSTALL_KEYS };
  }

  const removedKeys = BUSINESS_DATA_KEYS.filter((key) => window.localStorage.getItem(key) !== null);
  BUSINESS_DATA_KEYS.forEach((key) => window.localStorage.removeItem(key));
  window.localStorage.setItem(CLEANUP_VERSION_KEY, "done");

  return { ran: true, removedKeys, preservedKeys: PRESERVED_INSTALL_KEYS };
}

export function getInternalTrialCleanupPlan() {
  return {
    cleanupVersionKey: CLEANUP_VERSION_KEY,
    removedBusinessDataKeys: BUSINESS_DATA_KEYS,
    preservedInstallKeys: PRESERVED_INSTALL_KEYS,
  };
}
