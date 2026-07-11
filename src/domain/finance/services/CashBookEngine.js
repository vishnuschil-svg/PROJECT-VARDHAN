export const CashBookEngine = {
  buildCashBook(transactions = []) {
    const cashIn = sum(transactions, (transaction) => transaction.cashIn);
    const cashOut = sum(transactions, (transaction) => transaction.cashOut);

    return {
      entries: transactions.filter((transaction) => transaction.cashIn || transaction.cashOut),
      cashIn,
      cashOut,
      cashInHand: Math.max(0, cashIn - cashOut),
    };
  },
};

function sum(rows, getter) {
  return rows.reduce((total, row) => total + Number(getter(row) || 0), 0);
}
