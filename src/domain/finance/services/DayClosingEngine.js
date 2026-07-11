export const DayClosingEngine = {
  buildDayClosing({ income = [], expenses = [], cashBook, bankBook, dateKey = new Date().toISOString().slice(0, 10) } = {}) {
    const todaysIncome = sum(filterByDate(income, dateKey), (entry) => entry.amount);
    const todaysExpense = sum(filterByDate(expenses, dateKey), (entry) => entry.amount);
    const closingBalance = Number(cashBook?.cashInHand || 0) + Number(bankBook?.bankBalance || 0);

    return {
      date: dateKey,
      todaysIncome,
      todaysExpense,
      closingBalance,
      difference: closingBalance - todaysIncome + todaysExpense,
      status: closingBalance >= 0 ? "Balanced" : "Review",
    };
  },

  buildMonthClosing({ profit, monthKey = new Date().toISOString().slice(0, 7) } = {}) {
    return {
      month: monthKey,
      netProfit: Number(profit?.netProfit || 0),
      status: Number(profit?.netProfit || 0) >= 0 ? "Profitable" : "Review",
    };
  },
};

function filterByDate(rows, dateKey) {
  return rows.filter((row) => String(row.date || "").slice(0, 10) === dateKey);
}

function sum(rows, getter) {
  return rows.reduce((total, row) => total + Number(getter(row) || 0), 0);
}
