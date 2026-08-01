import { BankTransaction } from "../entities/BankTransaction.js";
import { CashTransaction } from "../entities/CashTransaction.js";
import { Expense } from "../entities/Expense.js";
import { Income } from "../entities/Income.js";
import { AccountingValidator } from "../validators/AccountingValidator.js";

export const AccountingEngine = {
  normalizeSource(source = {}) {
    const financeEntries = source.financeEntries || [];
    const postedCollectionKeys = new Set(financeEntries.flatMap((entry) => [
      String(entry.id || "").replace(/^finance-/, ""),
      String(entry.receipt_no || entry.receipt_number || entry.receiptNumber || ""),
    ]).filter(Boolean));
    const collectionIncome = (source.collections || [])
      .filter((collection) => ![
        collection.id,
        collection.receipt_no,
        collection.receipt_number,
        collection.receiptNumber,
      ].some((key) => key && postedCollectionKeys.has(String(key))))
      .map((collection) => new Income(collection));

    return {
      cashTransactions: financeEntries.map((entry) => new CashTransaction(entry)),
      bankTransactions: financeEntries.map((entry) => new BankTransaction(entry)),
      income: [
        ...financeEntries.filter(isIncomeEntry).map((entry) => new Income(entry)),
        ...collectionIncome,
      ],
      expenses: financeEntries.filter(isExpenseEntry).map((entry) => new Expense(entry)),
      validation: financeEntries.map((entry) => AccountingValidator.validateTransaction(entry, financeEntries)),
    };
  },

  buildDayBook(source = {}) {
    const normalized = this.normalizeSource(source);
    return [...normalized.income, ...normalized.expenses]
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  },
};

export function isIncomeEntry(entry) {
  return ["income", "credit", "receipt"].includes(String(entry.type || "").toLowerCase())
    || Number(entry.cash_in || entry.bank_in || 0) > 0;
}

export function isExpenseEntry(entry) {
  return ["expense", "debit", "payment"].includes(String(entry.type || "").toLowerCase())
    || Number(entry.cash_out || entry.bank_out || 0) > 0;
}
