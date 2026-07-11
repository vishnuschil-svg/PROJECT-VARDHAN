import { Expense } from "../domain/chit/entities/Expense.js";
import { ExpenseRepository } from "../repositories/ExpenseRepository.js";
import { FinanceRepository } from "../repositories/chits/FinanceRepository.js";

export function addExpense(input, activeTenantContext) {
  const expense = ExpenseRepository.save(new Expense(input).toJSON(), activeTenantContext);
  const mode = String(expense.paymentMode || "").toUpperCase();
  const isBank = mode !== "CASH";
  FinanceRepository.upsert({
    id: `expense-finance-${expense.id}`,
    type: "expense",
    category: expense.category,
    description: expense.notes || expense.vendor || expense.category,
    amount: expense.amount,
    cash_out: isBank ? 0 : expense.amount,
    bank_out: isBank ? expense.amount : 0,
    payment_mode: expense.paymentMode,
    status: expense.status,
    date: expense.date,
  }, { activeTenantContext });
  return expense;
}

export function listExpenses(activeTenantContext) {
  return ExpenseRepository.list(activeTenantContext);
}

export function calculateExpenseImpact(expenses = [], income = 0) {
  const totalExpense = expenses.reduce((total, row) => total + Number(row.amount || 0), 0);
  return { totalExpense, netAfterExpense: Number(income || 0) - totalExpense };
}
