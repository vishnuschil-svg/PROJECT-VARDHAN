import { createReceiptStyles, createReceiptTemplate } from "./ReceiptTemplate";

export function createReceiptPrintLayout(receipt, template) {
  return `
    <!doctype html>
    <html>
      <head>
        <title>${receipt.receiptNumber}</title>
        <style>
          body { margin: 0; display: grid; place-items: center; min-height: 100vh; background: #eef3fb; }
          ${createReceiptStyles()}
          @media print { body { background: #ffffff; } .receipt-template { box-shadow: none; } }
        </style>
      </head>
      <body>${createReceiptTemplate(receipt, template)}</body>
    </html>
  `.trim();
}
