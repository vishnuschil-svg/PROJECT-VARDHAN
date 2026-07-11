const VALID_PAYMENT_MODES = ["cash", "bank", "upi", "cheque", "online", "card", "wallet", "bank transfer"];

export const AccountingValidator = {
  validateTransaction(transaction = {}, existingEntries = []) {
    const errors = [];
    const amount = Number(transaction.amount || transaction.cash_in || transaction.cash_out || transaction.bank_in || transaction.bank_out || 0);
    const paymentMode = String(transaction.payment_mode || transaction.paymentMode || "").toLowerCase();
    const transactionDate = transaction.date || transaction.payment_date || transaction.created_at;
    const duplicate = existingEntries.some((entry) =>
      entry.id !== transaction.id &&
      ((entry.voucher_no && entry.voucher_no === transaction.voucher_no) ||
        (entry.receipt_no && entry.receipt_no === transaction.receipt_no))
    );
    const debit = Number(transaction.debit || transaction.cash_out || transaction.bank_out || 0);
    const credit = Number(transaction.credit || transaction.cash_in || transaction.bank_in || transaction.amount || 0);

    if (duplicate) errors.push("Duplicate finance entry.");
    if (amount < 0) errors.push("Invalid transaction amount.");
    if (!amount && !debit && !credit) errors.push("Invalid transaction.");
    if (paymentMode && !VALID_PAYMENT_MODES.includes(paymentMode)) errors.push("Invalid payment mode.");
    if (!transaction.account && !transaction.category && !transaction.particulars) errors.push("Missing ledger.");
    if (!transactionDate || Number.isNaN(new Date(transactionDate).getTime())) errors.push("Invalid date.");
    if (String(transaction.month_status || transaction.monthStatus || "").toLowerCase() === "closed") {
      errors.push("Closed month protection.");
    }
    if (Number(transaction.balance || 0) < 0) errors.push("Negative balance is not allowed.");
    if (debit && credit && debit !== credit && String(transaction.type || "").toLowerCase() === "journal") {
      errors.push("Balance mismatch.");
    }

    return createValidation(errors);
  },

  validateLedgerBalance(entries = []) {
    const debit = entries.reduce((sum, entry) => sum + Number(entry.debit || 0), 0);
    const credit = entries.reduce((sum, entry) => sum + Number(entry.credit || 0), 0);
    return createValidation(debit === credit ? [] : ["Ledger mismatch."]);
  },
};

export function createValidation(errors = [], warnings = []) {
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
