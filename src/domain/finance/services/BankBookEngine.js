export const BankBookEngine = {
  buildBankBook(transactions = []) {
    const bankIn = sum(transactions, (transaction) => transaction.bankIn);
    const bankOut = sum(transactions, (transaction) => transaction.bankOut);

    return {
      entries: transactions.filter((transaction) => transaction.bankIn || transaction.bankOut),
      bankIn,
      bankOut,
      bankBalance: Math.max(0, bankIn - bankOut),
    };
  },
};

function sum(rows, getter) {
  return rows.reduce((total, row) => total + Number(getter(row) || 0), 0);
}
