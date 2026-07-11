import { Profit } from "../entities/Profit.js";

export const ProfitEngine = {
  buildProfitRegister({ income = [], expenses = [], commissions = [], pendingCollection = 0, period = "" } = {}) {
    const incomeTotal = sum(income, (entry) => entry.amount);
    const expenseTotal = sum(expenses, (entry) => entry.amount);
    const commissionTotal = sum(commissions, (entry) => entry.amount);
    const netProfit = incomeTotal + commissionTotal - expenseTotal - Number(pendingCollection || 0);

    return new Profit({
      period,
      income: incomeTotal,
      expense: expenseTotal,
      commission: commissionTotal,
      pendingCollection,
      netProfit,
    });
  },
};

function sum(rows, getter) {
  return rows.reduce((total, row) => total + Number(getter(row) || 0), 0);
}
