import { LedgerRepository } from "../repositories/LedgerRepository.js";
import { LedgerEngine } from "../domain/finance/services/LedgerEngine.js";

export function getLedgerModel(activeTenantContext) {
  const source = LedgerRepository.getLedgerSource(activeTenantContext);
  return LedgerEngine.buildLedger(source);
}

export function listLedgerEntries(activeTenantContext) {
  return getLedgerModel(activeTenantContext).entries;
}

export function saveLedgerEntry(entry, activeTenantContext) {
  return LedgerRepository.saveLedgerEntry(entry, activeTenantContext);
}
