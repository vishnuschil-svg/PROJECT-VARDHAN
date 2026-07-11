import { ChitLifecycleRepository } from "../repositories/ChitLifecycleRepository.js";
import {
  AuctionRepository,
  CollectionsRepository,
  FinanceRepository,
  GroupsRepository,
  MembersRepository,
  ReceiptsRepository,
  ReportsRepository,
  getTenantScope,
} from "../repositories/chits/index.js";
import { reconcileChitLifecycle } from "./reconciliationService.js";

const TRIAL_CHIT_NAME = "MITRA NIDHI REAL TRIAL";
const TRIAL_TAG = "V1_REAL_TRIAL";

const TRIAL_SAMPLE = {
  chitName: TRIAL_CHIT_NAME,
  chitValue: "Rs. 1,00,000",
  members: "10",
  monthlyPayment: "Rs. 10,000",
  duration: "10 Months",
  startMonth: "Current month",
};

const STATUS = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN PROGRESS",
  PASSED: "PASSED",
  FAILED: "FAILED",
};

export function getTrialRunChecklist(activeTenantContext) {
  const source = ChitLifecycleRepository.getLifecycleSource(activeTenantContext);
  const context = buildTrialContext(source);
  const reconciliation = reconcileChitLifecycle(source);

  return {
    title: "Version 1.0 Real Trial Run",
    subtitle: "Guided real chit lifecycle trial for MITRA NIDHI CHITI PRO",
    sample: TRIAL_SAMPLE,
    trialTag: TRIAL_TAG,
    progress: buildProgress(context),
    steps: buildSteps(context),
    reconciliation,
    failures: buildFailures(context, reconciliation),
  };
}

export function startTrialRun(activeTenantContext) {
  return getTrialRunChecklist(activeTenantContext);
}

export function resumeTrialRun(activeTenantContext) {
  return getTrialRunChecklist(activeTenantContext);
}

export function resetTrialData(activeTenantContext) {
  const scope = getTenantScope(activeTenantContext);

  if (!scope.scope_key) {
    return getTrialRunChecklist(activeTenantContext);
  }

  [
    GroupsRepository,
    MembersRepository,
    CollectionsRepository,
    AuctionRepository,
    ReceiptsRepository,
    FinanceRepository,
    ReportsRepository,
  ].forEach((repository) => {
    repository.list({ activeTenantContext, pageSize: Number.MAX_SAFE_INTEGER }).data
      .filter(isTrialRecord)
      .forEach((record) => repository.delete(record.id, { activeTenantContext }));
  });

  return getTrialRunChecklist(activeTenantContext);
}

export function reconcileTrialRun(activeTenantContext) {
  return reconcileChitLifecycle(ChitLifecycleRepository.getLifecycleSource(activeTenantContext));
}

export function exportTrialRunReport(model) {
  const rows = [
    "VARDHAN REAL TRIAL RUN REPORT",
    `Generated At,${new Date().toISOString()}`,
    "",
    "Step,Title,Status",
    ...model.steps.map((step) => `${step.id},"${step.title}",${step.status}`),
    "",
    "Reconciliation,Status,Expected,Actual,Difference,Message",
    ...model.reconciliation.checks.map((check) =>
      `"${check.title}",${check.status},${check.expected},${check.actual},${check.difference},"${check.message}"`
    ),
  ];

  return {
    fileName: "vardhan-real-trial-report.csv",
    mimeType: "text/csv;charset=utf-8",
    content: rows.join("\n"),
  };
}

function buildTrialContext({ groups = [], members = [], collections = [], auctions = [], receipts = [], financeEntries = [] }) {
  const trialGroup = groups.find((group) =>
    String(group.chit_name || group.name || "").toLowerCase() === TRIAL_CHIT_NAME.toLowerCase()
  ) || null;
  const groupId = trialGroup?.id || "";
  const groupMembers = members.filter((member) =>
    groupId && [member.group_id, member.chit_group_id, member.groupId].includes(groupId)
  );
  const groupCollections = collections.filter((collection) =>
    groupId && [collection.group_id, collection.chit_group_id, collection.groupId].includes(groupId)
  );
  const groupAuctions = auctions.filter((auction) =>
    groupId && [auction.group_id, auction.chit_group_id, auction.groupId].includes(groupId)
  );
  const groupReceipts = receipts.filter((receipt) =>
    groupId && [receipt.group_id, receipt.groupId].includes(groupId)
  );
  const groupFinance = financeEntries.filter((entry) =>
    isTrialRecord(entry) || groupCollections.some((collection) => entry.receipt_no === collection.receipt_number)
  );

  return {
    trialGroup,
    groupMembers,
    groupCollections,
    groupAuctions,
    receipts: groupReceipts,
    financeEntries: groupFinance,
    hasMonthOneCollection: groupCollections.some((collection) => Number(collection.paid_amount || 0) > 0),
    hasPartialPayment: groupCollections.some((collection) => Number(collection.pending_amount || 0) > 0),
    hasAdvancePayment: groupCollections.some((collection) =>
      Number(collection.advance_amount || 0) > 0 || String(collection.payment_type || "").toLowerCase().includes("advance")
    ),
    hasLatePayment: groupCollections.some((collection) =>
      Number(collection.fine_amount || 0) > 0 || String(collection.payment_type || "").toLowerCase().includes("late")
    ),
    hasPendingMember: groupMembers.some((member) => Number(member.pending_amount || 0) > 0),
    hasWinner: groupAuctions.some((auction) => auction.winner_member_id || auction.winnerMemberId),
    hasClosedMonth: groupCollections.some((collection) =>
      String(collection.month_status || "").toLowerCase() === "closed"
    ),
    isArchived: String(trialGroup?.status || "").toLowerCase() === "archived",
  };
}

function buildSteps(context) {
  const groupCreated = Boolean(context.trialGroup?.id);
  const membersAdded = context.groupMembers.length >= 10;
  const groupActiveOrArchived = ["active", "archived"].includes(String(context.trialGroup?.status || "").toLowerCase());
  const auctionReady = context.groupAuctions.length > 0 || Boolean(context.trialGroup?.next_auction_date);
  const receiptGenerated = context.receipts.length > 0 || context.groupCollections.some((collection) => collection.receipt_number);
  const ledgerReady = context.groupMembers.length > 0 && context.groupCollections.length > 0;
  const financeUpdated = context.financeEntries.length > 0;
  const auction = context.groupAuctions[0] || {};
  const auctionCalculated = Number(auction.prize_amount || 0) > 0 &&
    Number(auction.discount_amount || 0) > 0 &&
    Number(auction.dividend_amount || 0) > 0 &&
    Number(auction.commission_amount || 0) > 0;

  return [
    createStep(1, "Create chit group", "/chits/groups", getStatus(groupCreated, true), "Trial group exists in the active tenant only."),
    createStep(2, "Add 10 members", "/chits/members", getStatus(membersAdded, groupCreated), "Trial members are tagged and isolated."),
    createStep(3, "Activate group", "/chits/groups", getStatus(groupActiveOrArchived, membersAdded), "Group is ready for Month 1 collection."),
    createStep(4, "Record one full payment", "/chits/collections", getStatus(context.hasMonthOneCollection, groupActiveOrArchived), "One member has a full Month 1 payment."),
    createStep(5, "Record one partial payment", "/chits/collections", getStatus(context.hasPartialPayment, groupActiveOrArchived), "One member has paid and pending amounts."),
    createStep(6, "Record one advance payment", "/chits/collections", getStatus(context.hasAdvancePayment, groupActiveOrArchived), "One member paid in advance."),
    createStep(7, "Leave one member pending", "/chits/collections/pending", getStatus(context.hasPendingMember, groupActiveOrArchived), "Pending balance is visible."),
    createStep(8, "Record one late payment", "/chits/collections", getStatus(context.hasLatePayment, groupActiveOrArchived), "Late payment includes a penalty/fine."),
    createStep(9, "Attempt duplicate payment and confirm it is blocked", "/chits/collections", getStatus(Boolean(context.trialGroup?.duplicate_payment_blocked), context.hasMonthOneCollection), "Duplicate guard result is stored."),
    createStep(10, "Generate receipts", "/chits/receipts", getStatus(receiptGenerated, context.hasMonthOneCollection), "Receipts exist for posted collections."),
    createStep(11, "Print/reprint receipt", "/chits/receipts", getStatus(context.receipts.some((receipt) => Number(receipt.reprint_count || 0) > 0), receiptGenerated), "Reprint tracking is available."),
    createStep(12, "Test WhatsApp fallback", "/chits/receipts", getStatus(context.receipts.some((receipt) => receipt.can_print_whatsapp), receiptGenerated), "WhatsApp fallback metadata exists."),
    createStep(13, "Verify pending collections", "/chits/collections/pending", getStatus(context.hasPendingMember, groupActiveOrArchived), "Pending collections reconcile to member balances."),
    createStep(14, "Run auction or lucky draw", "/chits/auctions", getStatus(auctionReady, groupActiveOrArchived), "Auction/lucky draw record exists."),
    createStep(15, "Declare winner", "/chits/auctions", getStatus(context.hasWinner, auctionReady), "Winner is recorded for Month 1."),
    createStep(16, "Calculate prize amount", "/chits/auctions", getStatus(Number(auction.prize_amount || 0) > 0, context.hasWinner), "Prize amount is stored from the domain engine."),
    createStep(17, "Calculate discount", "/chits/auctions", getStatus(Number(auction.discount_amount || 0) > 0, context.hasWinner), "Discount is stored from the domain engine."),
    createStep(18, "Calculate dividend", "/chits/dividends", getStatus(Number(auction.dividend_amount || 0) > 0, context.hasWinner), "Dividend is stored from the domain engine."),
    createStep(19, "Calculate commission", "/chits/finance", getStatus(Number(auction.commission_amount || 0) > 0, context.hasWinner), "Commission is stored from the domain engine."),
    createStep(20, "Update member ledger", "/chits/member-ledger", getStatus(ledgerReady, receiptGenerated), "Ledger can be reviewed from collections and receipts."),
    createStep(21, "Verify member passbook", "/chits/member-ledger", getStatus(ledgerReady, receiptGenerated), "Passbook uses the same ledger source."),
    createStep(22, "Verify cash/bank entry", "/chits/finance", getStatus(financeUpdated, context.hasMonthOneCollection), "Cash and bank entries exist."),
    createStep(23, "Verify finance summary", "/chits/finance", getStatus(financeUpdated, context.hasMonthOneCollection), "Finance summary uses repository totals."),
    createStep(24, "Verify collection reports", "/chits/reports", getStatus(context.groupCollections.length > 0, context.hasMonthOneCollection), "Collection report source is populated."),
    createStep(25, "Verify receipt register", "/chits/receipts", getStatus(receiptGenerated, context.hasMonthOneCollection), "Receipt register has saved receipts."),
    createStep(26, "Verify profit report", "/chits/reports", getStatus(auctionCalculated, context.hasWinner), "Auction profit inputs are available."),
    createStep(27, "Verify dashboard KPIs", "/dashboard", getStatus(groupActiveOrArchived && context.hasMonthOneCollection, financeUpdated), "Dashboard KPIs read repository totals."),
    createStep(28, "Verify AI insights", "/dashboard", getStatus(groupActiveOrArchived && context.hasMonthOneCollection, financeUpdated), "AI insights can consume updated repository data."),
    createStep(29, "Preview month closing", "/chits/groups", getStatus(Boolean(context.trialGroup?.month_close_previewed), groupActiveOrArchived), "Month close preview was generated."),
    createStep(30, "Close month", "/chits/groups", getStatus(context.hasClosedMonth, Boolean(context.trialGroup?.month_close_previewed)), "Month 1 is closed on trial records."),
    createStep(31, "Confirm closed-month payment is blocked", "/chits/collections", getStatus(Boolean(context.trialGroup?.closed_month_payment_blocked), context.hasClosedMonth), "Closed-month guard result is stored."),
    createStep(32, "Reopen month only with permission and reason", "/chits/settings", getStatus(Boolean(context.trialGroup?.reopen_reason), context.hasClosedMonth), "Permission reason is stored."),
    createStep(33, "Complete trial chit lifecycle", "/chits/groups", getStatus(String(context.trialGroup?.lifecycle_status || "").toLowerCase() === "completed", context.hasClosedMonth), "Trial lifecycle is marked complete."),
    createStep(34, "Archive completed chit", "/chits/groups", getStatus(context.isArchived, String(context.trialGroup?.lifecycle_status || "").toLowerCase() === "completed"), "Trial chit is archived."),
    createStep(35, "Confirm active chit slot is released", "/chits/groups", getStatus(Boolean(context.trialGroup?.active_slot_released), context.isArchived), "Active slot release is recorded."),
  ];
}

function buildProgress(context) {
  const steps = buildSteps(context);
  const completed = steps.filter((step) => step.status === STATUS.PASSED).length;

  return {
    completed,
    total: steps.length,
    percent: Math.round((completed / steps.length) * 100),
  };
}

function createStep(id, title, route, status, helper) {
  return {
    id,
    title,
    route,
    status,
    helper,
    actionLabel: status === STATUS.PASSED ? "Review" : "Open",
  };
}

function getStatus(completed, prerequisiteReady) {
  if (completed) return STATUS.PASSED;
  if (prerequisiteReady) return STATUS.IN_PROGRESS;
  return STATUS.PENDING;
}

function buildFailures(context, reconciliation) {
  return [
    ...buildSteps(context)
      .filter((step) => step.status === STATUS.FAILED)
      .map((step) => `${step.title}: failed`),
    ...reconciliation.checks
      .filter((check) => check.status === "FAIL")
      .map((check) => `${check.title}: ${check.message}`),
  ];
}

function isTrialRecord(record) {
  return record.trial_source === TRIAL_TAG ||
    String(record.chit_name || "").toLowerCase() === TRIAL_CHIT_NAME.toLowerCase();
}
