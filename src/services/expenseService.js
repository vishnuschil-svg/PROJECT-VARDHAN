import {
  assertExpenseAuthorized,
  listExpensesPersistent,
  postExpensePersistent,
} from "./closingLifecyclePersistence.js";

export async function addExpense(input, activeTenantContext, auth = {}) {
  const result = await postExpensePersistent(input, activeTenantContext, auth);
  if (!result.success) {
    throw new Error(result.message || "Expense could not be posted.");
  }
  return result.expense;
}

export async function listExpenses(activeTenantContext) {
  return listExpensesPersistent(activeTenantContext);
}

export function calculateExpenseImpact(expenses = [], income = 0) {
  const totalExpense = expenses.reduce((total, row) => total + Number(row.amount || 0), 0);
  return { totalExpense, netAfterExpense: Number(income || 0) - totalExpense };
}

export { assertExpenseAuthorized };
