export const ProfitEngine = {
  calculateMonthProfit({ collections = [], financeEntries = [], monthKey = "" } = {}) {
    const monthCollections = collections.filter((collection) => getRecordDate(collection).startsWith(monthKey));
    const monthFinance = financeEntries.filter((entry) => getRecordDate(entry).startsWith(monthKey));
    return this.calculateTotalProfit({ collections: monthCollections, financeEntries: monthFinance });
  },

  calculateTotalProfit({ collections = [], financeEntries = [], pendingAmount = 0 } = {}) {
    const collected = sum(collections, (collection) => collection.paid_amount || collection.paidAmount);
    const income = sum(financeEntries.filter(isIncomeEntry), (entry) => entry.amount || entry.cash_in || entry.bank_in);
    const expense = sum(financeEntries.filter(isExpenseEntry), (entry) => entry.amount || entry.cash_out || entry.bank_out);
    return collected + income - expense - Number(pendingAmount || 0);
  },
};

function getRecordDate(record) {
  return String(record.payment_date || record.date || record.created_at || "").slice(0, 10);
}

function isIncomeEntry(entry) {
  return ["income", "credit", "receipt"].includes(String(entry.type || "").toLowerCase())
    || Number(entry.cash_in || entry.bank_in || 0) > 0;
}

function isExpenseEntry(entry) {
  return ["expense", "debit", "payment"].includes(String(entry.type || "").toLowerCase())
    || Number(entry.cash_out || entry.bank_out || 0) > 0;
}

function sum(rows, getter) {
  return rows.reduce((total, row) => total + Number(getter(row) || 0), 0);
}
