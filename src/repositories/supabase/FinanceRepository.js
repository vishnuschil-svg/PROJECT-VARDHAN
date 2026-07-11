import { SupabaseRepository } from "../../lib/supabase/SupabaseRepository.js";

export const FinanceRepository = new SupabaseRepository({
  tableName: "chit_finance_entries",
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
  defaultSort: { column: "date", ascending: false },
  normalizeInput: (entry) => ({
    ...entry,
    amount: Number(entry.amount || 0),
    cash_in: Number(entry.cash_in || entry.cashIn || 0),
    cash_out: Number(entry.cash_out || entry.cashOut || 0),
    bank_in: Number(entry.bank_in || entry.bankIn || 0),
    bank_out: Number(entry.bank_out || entry.bankOut || 0),
    balance: Number(entry.balance || 0),
    payment_mode: entry.payment_mode || entry.paymentMode,
  }),
});
