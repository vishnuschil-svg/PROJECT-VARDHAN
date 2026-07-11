export function generateReceiptNumber(existingReceipts = [], date = new Date()) {
  const datePart = date.toISOString().slice(0, 10).replaceAll("-", "");
  const existingNumbers = new Set(
    existingReceipts
      .map((receipt) => receipt.receiptNumber || receipt.receipt_number)
      .filter(Boolean)
  );
  let sequence = existingNumbers.size + 1;
  let receiptNumber = `MNCP-RCP-${datePart}-${String(sequence).padStart(4, "0")}`;

  while (existingNumbers.has(receiptNumber)) {
    sequence += 1;
    receiptNumber = `MNCP-RCP-${datePart}-${String(sequence).padStart(4, "0")}`;
  }

  return receiptNumber;
}

export const ReceiptNumberEngine = {
  generate: generateReceiptNumber,
};
