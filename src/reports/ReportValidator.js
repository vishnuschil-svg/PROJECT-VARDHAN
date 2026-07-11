export const ReportValidator = {
  validate({ reportId, source = {}, filters = {}, rows = [] } = {}) {
    const errors = [];
    const warnings = [];
    const fromDate = filters.dateRange?.from;
    const toDate = filters.dateRange?.to;

    if (fromDate && toDate && fromDate > toDate) errors.push("Invalid date range.");
    if (filters.groupId && filters.groupId !== "all" && !(source.groups || []).some((group) => group.id === filters.groupId)) {
      errors.push("Missing group.");
    }
    if (filters.memberId && filters.memberId !== "all" && !(source.members || []).some((member) => member.id === filters.memberId)) {
      errors.push("Missing member.");
    }
    if (!rows.length) warnings.push("Empty report handling.");
    if (hasClosedMonthMismatch(source.collections || [])) warnings.push("Closed month consistency needs review.");
    if (hasDuplicateReceipts(source.receipts || [], source.collections || [])) errors.push("Duplicate receipt consistency issue.");
    if (hasLedgerMismatch(source.financeEntries || [])) warnings.push("Ledger mismatch detected.");
    if (hasCollectionFinanceMismatch(source.collections || [], source.financeEntries || [])) {
      warnings.push("Collection total vs finance total mismatch.");
    }

    return {
      reportId,
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },
};

function hasClosedMonthMismatch(collections) {
  return collections.some((collection) =>
    String(collection.month_status || collection.monthStatus || "").toLowerCase() === "closed" &&
    Number(collection.pending_amount || 0) > 0
  );
}

function hasDuplicateReceipts(receipts, collections) {
  const numbers = [
    ...receipts.map((receipt) => receipt.receipt_number || receipt.receiptNumber),
    ...collections.map((collection) => collection.receipt_number || collection.receiptNumber),
  ].filter(Boolean);
  return numbers.length !== new Set(numbers).size;
}

function hasLedgerMismatch(financeEntries) {
  const debit = financeEntries.reduce((sum, entry) => sum + Number(entry.debit || entry.cash_out || entry.bank_out || 0), 0);
  const credit = financeEntries.reduce((sum, entry) => sum + Number(entry.credit || entry.cash_in || entry.bank_in || entry.amount || 0), 0);
  return debit > 0 && credit > 0 && Math.abs(debit - credit) > 1;
}

function hasCollectionFinanceMismatch(collections, financeEntries) {
  const collectionTotal = collections.reduce((sum, collection) => sum + Number(collection.paid_amount || 0), 0);
  const financeCollectionTotal = financeEntries
    .filter((entry) => String(entry.category || "").toLowerCase() === "collection")
    .reduce((sum, entry) => sum + Number(entry.amount || entry.cash_in || entry.bank_in || 0), 0);

  return financeCollectionTotal > 0 && Math.abs(collectionTotal - financeCollectionTotal) > 1;
}
