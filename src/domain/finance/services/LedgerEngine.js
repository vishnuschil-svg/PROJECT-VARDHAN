import { LedgerEntry } from "../entities/LedgerEntry.js";
import { AccountingValidator } from "../validators/AccountingValidator.js";

export const LedgerEngine = {
  buildLedger(source = {}) {
    const entries = [
      ...(source.financeEntries || []).map((entry) => new LedgerEntry(entry)),
      ...(source.collections || []).map((collection) => new LedgerEntry({
        ...collection,
        account: "Collections",
        credit: collection.paid_amount,
        reference: collection.receipt_number,
      })),
    ];

    return {
      entries,
      journal: entries.map((entry) => ({
        id: entry.id,
        date: entry.date,
        narration: entry.account,
        debit: entry.debit,
        credit: entry.credit,
        reference: entry.reference,
      })),
      trialBalance: {
        status: "future-ready",
        validation: AccountingValidator.validateLedgerBalance(entries),
      },
    };
  },
};
