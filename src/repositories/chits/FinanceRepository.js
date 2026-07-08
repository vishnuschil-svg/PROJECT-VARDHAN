import { LocalStorageRepository } from "./LocalStorageRepository";

export const FinanceRepository = new LocalStorageRepository({
  storageKey: "vardhan.chit.finance.v1",
  entityName: "finance-entry",
  searchableFields: [
    "type",
    "category",
    "particulars",
    "description",
    "payment_mode",
    "status",
    "receipt_no",
    "voucher_no",
  ],
  normalize: (entry) => ({
    ...entry,
    amount: Number(entry.amount || 0),
    cash_in: Number(entry.cash_in || 0),
    cash_out: Number(entry.cash_out || 0),
    bank_in: Number(entry.bank_in || 0),
    bank_out: Number(entry.bank_out || 0),
    balance: Number(entry.balance || 0),
  }),
  sort: (a, b) => new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0),
});
