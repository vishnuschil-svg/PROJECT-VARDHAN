import {
  escapeReceiptText,
  formatReceiptCurrency,
  formatReceiptDate,
  formatReceiptDateTime,
} from "./ReceiptFormatter";

export const RECEIPT_TEMPLATES = {
  ROYAL: "ROYAL",
  COMPACT: "COMPACT",
};

export function createReceiptTemplate(receipt, template = RECEIPT_TEMPLATES.ROYAL) {
  const rows = [
    ["Receipt Number", receipt.receiptNumber],
    ["Date & Time", formatReceiptDateTime(receipt.createdAt)],
    ["Member", receipt.memberName],
    ["Chit Group", receipt.chitName],
    ["Installment Month", receipt.installmentMonth],
    ["Amount Paid", formatReceiptCurrency(receipt.amountPaid)],
    ["Pending Amount", formatReceiptCurrency(receipt.pendingAmount)],
    ["Total Paid", formatReceiptCurrency(receipt.totalPaid)],
    ["Balance", formatReceiptCurrency(receipt.balance)],
    ["Payment Date", formatReceiptDate(receipt.paymentDate)],
    ["Payment Mode", receipt.paymentMode],
    ["Collected By", receipt.createdBy],
  ];

  return `
    <section class="receipt-template receipt-template-${template.toLowerCase()}">
      <header>
        <div class="receipt-logo">MN</div>
        <div>
          <span>MITRA NIDHI CHITI PRO</span>
          <h1>Payment Receipt</h1>
          <p>${escapeReceiptText(receipt.tenantId)}</p>
        </div>
      </header>
      <main>
        ${rows.map(([label, value]) => `
          <div>
            <span>${escapeReceiptText(label)}</span>
            <strong>${escapeReceiptText(value)}</strong>
          </div>
        `).join("")}
      </main>
      <aside>
        <strong>Owner Bank Details</strong>
        <p>${escapeReceiptText(receipt.ownerBankDetails?.accountName || "")}</p>
        <p>${escapeReceiptText(receipt.ownerBankDetails?.bankName || "")}</p>
        <p>${escapeReceiptText(receipt.ownerBankDetails?.accountNumber || "")} / ${escapeReceiptText(receipt.ownerBankDetails?.ifsc || "")}</p>
        <p>UPI: ${escapeReceiptText(receipt.ownerBankDetails?.upiId || "")}</p>
      </aside>
      <footer>${escapeReceiptText(receipt.footerNote)}</footer>
    </section>
  `.trim();
}

export function createReceiptStyles() {
  return `
    .receipt-template { width: 860px; min-height: 1120px; padding: 42px; border: 3px solid #d4af37; border-radius: 28px; color: #0f172a; background: #ffffff; font-family: Segoe UI, Arial, sans-serif; }
    .receipt-template header { display: flex; gap: 18px; align-items: center; padding: 28px; border-radius: 22px; color: #ffffff; background: linear-gradient(135deg, #07111f, #102044 58%, #8a6a1f); }
    .receipt-logo { display: grid; place-items: center; width: 72px; height: 72px; border-radius: 20px; color: #102044; background: #f4d66f; font-weight: 900; }
    .receipt-template header span { color: #f4d66f; font-weight: 900; }
    .receipt-template h1 { margin: 4px 0; font-size: 36px; }
    .receipt-template main { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin: 28px 0; }
    .receipt-template main div, .receipt-template aside { padding: 16px; border: 1px solid #e2e8f0; border-radius: 14px; background: #f8fafc; }
    .receipt-template main span { display: block; color: #64748b; font-size: 12px; font-weight: 800; text-transform: uppercase; }
    .receipt-template main strong { display: block; margin-top: 7px; font-size: 17px; }
    .receipt-template aside strong { display: block; margin-bottom: 8px; }
    .receipt-template aside p { margin: 5px 0; color: #475569; }
    .receipt-template footer { margin-top: 24px; color: #64748b; text-align: center; font-weight: 800; }
  `;
}
