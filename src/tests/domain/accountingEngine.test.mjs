import test from "node:test";
import assert from "node:assert/strict";
import { AccountingEngine } from "../../domain/finance/services/AccountingEngine.js";
import { CashBookEngine } from "../../domain/finance/services/CashBookEngine.js";
import { BankBookEngine } from "../../domain/finance/services/BankBookEngine.js";

test("finance engines build cash and bank books without UI calculations", () => {
  const normalized = AccountingEngine.normalizeSource({
    financeEntries: [
      { id: "income-1", type: "income", amount: 1000, cash_in: 1000, payment_mode: "cash" },
      { id: "expense-1", type: "expense", amount: 250, cash_out: 250, payment_mode: "cash" },
      { id: "bank-1", type: "income", amount: 500, bank_in: 500, payment_mode: "bank" },
    ],
    collections: [{ id: "collection-1", paid_amount: 300, payment_method: "upi" }],
  });
  const cashBook = CashBookEngine.buildCashBook(normalized.cashTransactions);
  const bankBook = BankBookEngine.buildBankBook(normalized.bankTransactions);

  assert.equal(cashBook.cashInHand, 750);
  assert.equal(bankBook.bankBalance, 500);
  assert.equal(normalized.income.length, 3);
  assert.equal(normalized.expenses.length, 1);
});
