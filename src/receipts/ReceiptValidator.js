export function validateReceiptModel(receipt, existingReceipts = [], options = {}) {
  const errors = [];
  const warnings = [];
  const ignoredReceiptId = options.ignoredReceiptId || receipt.id;

  if (!receipt.receiptNumber) {
    errors.push("Receipt number is required.");
  }

  if (existingReceipts.some((item) =>
    (item.id || item.receiptId) !== ignoredReceiptId &&
    (item.receipt_number === receipt.receiptNumber || item.receiptNumber === receipt.receiptNumber)
  )) {
    errors.push("Duplicate receipt number detected.");
  }

  if (!receipt.collectionId) {
    errors.push("Collection is required.");
  }

  if (!receipt.memberId) {
    errors.push("Member is required.");
  }

  if (!receipt.groupId) {
    errors.push("Group is required.");
  }

  if (Number(receipt.amountPaid || 0) <= 0) {
    errors.push("Invalid amount.");
  }

  if (Number(receipt.pendingAmount || 0) < 0 || Number(receipt.balance || 0) < 0) {
    errors.push("Pending amount and balance cannot be negative.");
  }

  if (!receipt.paymentDate || Number.isNaN(new Date(receipt.paymentDate).getTime())) {
    errors.push("Invalid receipt date.");
  }

  if (String(receipt.status || "").toLowerCase() === "cancelled" && !options.allowCancelledReprint) {
    errors.push("Cancelled receipt cannot be reprinted or regenerated.");
  }

  if (Number(receipt.reprintCount || 0) > 0) {
    warnings.push("Receipt has previous reprint history.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
