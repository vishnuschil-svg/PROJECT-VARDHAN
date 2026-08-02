import { LedgerEngine } from "../domain/finance/services/LedgerEngine.js";
import { FinanceRepository } from "../repositories/FinanceRepository.js";
import { buildMemberLedger } from "../config/chitMemberLedger.js";
import {
  listLedgerEntriesPersistent,
  saveLedgerEntryPersistent,
} from "./winnerLifecyclePersistence.js";
import { resolveRepositoryBackend, REPOSITORY_BACKENDS } from "../config/repositoryBackend.js";

export async function getLedgerModel(activeTenantContext) {
  if (resolveRepositoryBackend() === REPOSITORY_BACKENDS.LOCAL) {
    const source = FinanceRepository.getFinanceSource
      ? FinanceRepository.getFinanceSource(activeTenantContext)
      : { financeEntries: [], activeTenantContext };
    const stored = await listLedgerEntriesPersistent(activeTenantContext);
    return LedgerEngine.buildLedger({
      ...source,
      financeEntries: [...(source.financeEntries || []), ...stored],
    });
  }

  const entries = await listLedgerEntriesPersistent(activeTenantContext);
  return LedgerEngine.buildLedger({
    activeTenantContext,
    financeEntries: entries,
  });
}

export async function listLedgerEntries(activeTenantContext) {
  const model = await getLedgerModel(activeTenantContext);
  return model.entries;
}

export async function saveLedgerEntry(entry, activeTenantContext) {
  return saveLedgerEntryPersistent(entry, activeTenantContext);
}

export function buildAuthoritativeMemberLedger({
  member,
  group,
  collections = [],
  ledgerEntries = [],
  winners = [],
  payouts = [],
}) {
  const derived = buildMemberLedger({ member, group, collections });
  const memberEntries = ledgerEntries.filter(
    (entry) => entry.member_id === member?.id || entry.memberId === member?.id
  );
  const winner = winners.find(
    (row) =>
      (row.memberId || row.member_id) === member?.id &&
      (row.groupId || row.group_id) === group?.id &&
      String(row.status || "").toUpperCase() === "CONFIRMED"
  );
  const payout = payouts.find(
    (row) =>
      (row.member_id || row.memberId) === member?.id &&
      (row.group_id || row.groupId) === group?.id
  );

  const persistedLift = memberEntries
    .filter((entry) => String(entry.entry_type || entry.type) === "winner_lift")
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const persistedPayout = memberEntries
    .filter((entry) => String(entry.entry_type || entry.type) === "payout")
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const persistedCollection = memberEntries
    .filter((entry) => ["collection", "income"].includes(String(entry.entry_type || entry.type)))
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  const liftAmount = persistedLift || derived.lift_amount || Number(winner?.payoutAmount || 0);
  const openingBalance = 0;
  const closingBalance = Math.max(
    openingBalance +
      Number(derived.security_deposit || 0) +
      Number(derived.pending_installments || 0) +
      Number(derived.fine || 0) -
      Math.max(Number(derived.total_installments_paid || 0), persistedCollection) -
      Number(derived.discount || 0) -
      Number(derived.dividend_received || 0) -
      persistedPayout,
    0
  );

  return {
    ...derived,
    lift_amount: liftAmount,
    lift_status: liftAmount > 0 || winner ? "Lifted" : derived.lift_status,
    payout_paid: persistedPayout || Number(payout?.paid_amount || payout?.paidAmount || 0),
    payout_status: payout?.status || (persistedPayout > 0 ? "PAID" : "PENDING"),
    opening_balance: openingBalance,
    closing_balance: closingBalance,
    outstanding_balance: closingBalance,
    authoritative_entries: memberEntries,
    reload_consistent: true,
  };
}
