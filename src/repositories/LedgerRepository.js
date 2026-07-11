import { FinanceRepository } from "./FinanceRepository.js";

const LEDGER_STORAGE_KEY = "vardhan.finance.ledger.v1";

export const LedgerRepository = {
  getLedgerSource(activeTenantContext) {
    return FinanceRepository.getFinanceSource(activeTenantContext);
  },

  listLedgerEntries(activeTenantContext) {
    const source = this.getLedgerSource(activeTenantContext);
    const stored = listStoredLedger(source.activeTenantContext);
    return [...stored, ...source.financeEntries];
  },

  saveLedgerEntry(entry, activeTenantContext) {
    if (!canUseLocalStorage()) {
      return entry;
    }

    const scopeKey = `${activeTenantContext?.tenant_id || ""}:${activeTenantContext?.data_scope || ""}`;
    const nextEntry = {
      ...entry,
      id: entry.id || `ledger-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      scope_key: scopeKey,
      created_at: entry.created_at || new Date().toISOString(),
    };
    const existing = readStorage();
    window.localStorage.setItem(
      LEDGER_STORAGE_KEY,
      JSON.stringify([nextEntry, ...existing.filter((item) => item.id !== nextEntry.id)])
    );
    return nextEntry;
  },
};

function listStoredLedger(activeTenantContext) {
  const scopeKey = `${activeTenantContext?.tenant_id || ""}:${activeTenantContext?.data_scope || ""}`;

  if (!scopeKey.includes(":") || !canUseLocalStorage()) {
    return [];
  }

  return readStorage().filter((item) => item.scope_key === scopeKey);
}

function readStorage() {
  try {
    const raw = window.localStorage.getItem(LEDGER_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}
