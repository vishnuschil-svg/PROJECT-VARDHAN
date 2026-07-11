import { createReceiptPrintLayout } from "./ReceiptPrint";

export function createReceiptPDFLayout(receipt, template) {
  return {
    html: createReceiptPrintLayout(receipt, template),
    fileName: `${receipt.receiptNumber}.html`,
    mimeType: "text/html",
    isPDFReady: true,
  };
}
