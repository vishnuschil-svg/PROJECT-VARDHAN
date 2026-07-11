import { ReceiptNumber } from "../valueObjects/ReceiptNumber.js";

export const ReceiptNumberEngine = {
  generate({ prefix = "MNC", date = new Date(), sequence = 1 } = {}) {
    const dateKey = new Date(date).toISOString().slice(0, 10).replace(/-/g, "");
    return `${prefix}-${dateKey}-${String(sequence).padStart(5, "0")}`;
  },

  validateUnique(receiptNumber, receipts = []) {
    const number = new ReceiptNumber(receiptNumber);
    const duplicate = receipts.some((receipt) =>
      (receipt.receipt_number || receipt.receiptNumber) === number.toString()
    );

    return {
      isValid: number.isValid() && !duplicate,
      errors: [
        ...(!number.isValid() ? ["Invalid receipt number."] : []),
        ...(duplicate ? ["Receipt number must be unique."] : []),
      ],
    };
  },
};
