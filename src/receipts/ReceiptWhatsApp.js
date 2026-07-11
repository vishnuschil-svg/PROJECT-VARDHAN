import { formatReceiptCurrency, normalizeWhatsAppNumber } from "./ReceiptFormatter";

export function createReceiptWhatsAppMessage(receipt) {
  return [
    `Receipt ${receipt.receiptNumber}`,
    `Member: ${receipt.memberName}`,
    `Chit: ${receipt.chitName}`,
    `Month: ${receipt.installmentMonth}`,
    `Paid: ${formatReceiptCurrency(receipt.amountPaid)}`,
    `Pending: ${formatReceiptCurrency(receipt.pendingAmount)}`,
    `Balance: ${formatReceiptCurrency(receipt.balance)}`,
    receipt.footerNote,
  ].join("\n");
}

export function createWhatsAppShareLink(receipt, phoneNumber = "") {
  const phone = normalizeWhatsAppNumber(phoneNumber);
  const text = encodeURIComponent(createReceiptWhatsAppMessage(receipt));

  return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
}
