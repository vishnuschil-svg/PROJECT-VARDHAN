import { formatCurrency } from "./chitPhaseOneData";

export function buildReceiptNumber(collectionCount = 0) {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `MNCP-RCP-${datePart}-${String(collectionCount + 1).padStart(4, "0")}`;
}

export function createReceiptPayload({
  collection,
  member,
  group,
  activeTenantContext,
  companyName = "VARDHAN Own Chit Business",
}) {
  const installmentAmount = Number(collection.installment_amount || group?.monthly_amount || 0);
  const fineAmount = Number(collection.fine_amount || 0);
  const discountAmount = Number(collection.discount_amount || 0);
  const dividendAdjustment = Number(collection.dividend_adjustment || 0);
  const paidAmount = Number(collection.paid_amount || 0);
  const payableAmount = Math.max(
    installmentAmount + fineAmount - discountAmount - dividendAdjustment,
    0
  );
  const balanceAmount = Math.max(payableAmount - paidAmount, 0);

  return {
    receipt_number: collection.receipt_number,
    receipt_date_time: collection.created_at || new Date().toISOString(),
    member_name: member?.member_name || "Member",
    member_number: member?.member_number || "-",
    mobile_number: member?.mobile_number || "",
    whatsapp_number: member?.whatsapp_number || member?.mobile_number || "",
    chit_group: group?.chit_name || "Unassigned Chit Group",
    month: collection.collection_month,
    installment_amount: installmentAmount,
    fine_amount: fineAmount,
    discount_amount: discountAmount,
    dividend_adjustment: dividendAdjustment,
    paid_amount: paidAmount,
    balance_amount: balanceAmount,
    payment_date: collection.payment_date,
    payment_mode: collection.payment_method,
    collected_by: collection.collected_by || "VARDHAN Collector",
    company_name: companyName,
    tenant_id: activeTenantContext?.tenant_id || collection.tenant_id || "",
    data_scope: activeTenantContext?.data_scope || collection.data_scope || "",
  };
}

export function createReceiptSvg(receipt) {
  const rowsLeft = [
    ["Receipt Number", receipt.receipt_number],
    ["Date & Time", formatReceiptDateTime(receipt.receipt_date_time)],
    ["Member Name", receipt.member_name],
    ["Member Number", receipt.member_number],
    ["Mobile / WhatsApp", receipt.whatsapp_number || receipt.mobile_number || "-"],
    ["Chit Group", receipt.chit_group],
    ["Month", receipt.month],
    ["Installment Amount", formatCurrency(receipt.installment_amount)],
    ["Fine", formatCurrency(receipt.fine_amount)],
  ];
  const rowsRight = [
    ["Discount", formatCurrency(receipt.discount_amount)],
    ["Dividend Adjustment", formatCurrency(receipt.dividend_adjustment)],
    ["Amount Received", formatCurrency(receipt.paid_amount)],
    ["Balance", formatCurrency(receipt.balance_amount)],
    ["Payment Date", formatReceiptDate(receipt.payment_date)],
    ["Payment Mode", receipt.payment_mode],
    ["Collected By", receipt.collected_by],
    ["Notes", receipt.notes || "-"],
  ];

  const rowMarkup = [
    ...rowsLeft.map(([label, value], index) => renderReceiptRow(label, value, 92, 356, 444 + index * 62)),
    ...rowsRight.map(([label, value], index) => renderReceiptRow(label, value, 390, 650, 444 + index * 62)),
  ].join("");

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1280" viewBox="0 0 900 1280">
  <defs>
    <linearGradient id="header" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#07111f"/>
      <stop offset="0.55" stop-color="#102044"/>
      <stop offset="1" stop-color="#1d4ed8"/>
    </linearGradient>
    <radialGradient id="gold" cx="76%" cy="12%" r="64%">
      <stop offset="0" stop-color="#f3c969" stop-opacity="0.44"/>
      <stop offset="1" stop-color="#d4af37" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="900" height="1280" rx="34" fill="#eef3fb"/>
  <rect x="36" y="36" width="828" height="1208" rx="30" fill="#ffffff" stroke="#d4af37" stroke-width="3"/>
  <rect x="36" y="36" width="828" height="320" rx="30" fill="url(#header)"/>
  <rect x="36" y="36" width="828" height="320" rx="30" fill="url(#gold)"/>
  <rect x="86" y="88" width="92" height="92" rx="24" fill="rgba(255,255,255,0.1)" stroke="#d4af37" stroke-width="3"/>
  <text x="132" y="145" text-anchor="middle" font-family="Segoe UI, Arial" font-size="28" font-weight="900" fill="#f3c969">LOGO</text>
  <text x="450" y="112" text-anchor="middle" font-family="Segoe UI, Arial" font-size="30" font-weight="900" fill="#f3c969">MITRA NIDHI CHITI PRO</text>
  <text x="450" y="174" text-anchor="middle" font-family="Segoe UI, Arial" font-size="48" font-weight="900" fill="#ffffff">Payment Receipt</text>
  <text x="450" y="226" text-anchor="middle" font-family="Segoe UI, Arial" font-size="24" font-weight="700" fill="#dbeafe">${escapeXml(receipt.company_name)}</text>
  <text x="450" y="274" text-anchor="middle" font-family="Segoe UI, Arial" font-size="18" fill="#cbd5e1">${escapeXml(receipt.tenant_id)} / ${escapeXml(receipt.data_scope)}</text>
  <rect x="74" y="388" width="752" height="620" rx="22" fill="#f8fbff" stroke="#e2e8f0" stroke-width="2"/>
  ${rowMarkup}
  <rect x="86" y="1050" width="728" height="76" rx="26" fill="#ecfdf5" stroke="#10b981" stroke-width="2"/>
  <text x="120" y="1097" font-family="Segoe UI, Arial" font-size="22" font-weight="900" fill="#047857">Amount Received</text>
  <text x="780" y="1097" text-anchor="end" font-family="Segoe UI, Arial" font-size="32" font-weight="900" fill="#047857">${escapeXml(formatCurrency(receipt.paid_amount))}</text>
  <text x="450" y="1184" text-anchor="middle" font-family="Segoe UI, Arial" font-size="20" font-weight="900" fill="#07111f">Thank you for your payment</text>
</svg>`.trim();
}

function renderReceiptRow(label, value, labelX, valueX, y) {
      return `
        <text x="${labelX}" y="${y}" font-family="Segoe UI, Arial" font-size="17" font-weight="800" fill="#64748b">${escapeXml(label)}</text>
        <text x="${valueX}" y="${y + 28}" text-anchor="end" font-family="Segoe UI, Arial" font-size="20" font-weight="900" fill="#07111f">${escapeXml(value)}</text>
        <line x1="${labelX}" y1="${y + 42}" x2="${valueX}" y2="${y + 42}" stroke="#e2e8f0" stroke-width="2"/>
      `;
}

export function createReceiptImageUrl(receipt) {
  const svg = createReceiptSvg(receipt);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export async function createReceiptImageFile(receipt) {
  const svg = createReceiptSvg(receipt);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  return new File([blob], `${receipt.receipt_number}.svg`, { type: "image/svg+xml" });
}

export function createReceiptPdfFile(receipt) {
  const pdfText = [
    "MITRA NIDHI CHITI PRO",
    "Payment Receipt",
    "",
    `Receipt Number: ${receipt.receipt_number}`,
    `Date & Time: ${formatReceiptDateTime(receipt.receipt_date_time)}`,
    `Member Name: ${receipt.member_name}`,
    `Member Number: ${receipt.member_number}`,
    `Mobile / WhatsApp: ${receipt.whatsapp_number || receipt.mobile_number || "-"}`,
    `Chit Group: ${receipt.chit_group}`,
    `Month: ${receipt.month}`,
    `Installment Amount: ${formatCurrency(receipt.installment_amount)}`,
    `Fine: ${formatCurrency(receipt.fine_amount)}`,
    `Discount: ${formatCurrency(receipt.discount_amount)}`,
    `Dividend Adjustment: ${formatCurrency(receipt.dividend_adjustment)}`,
    `Amount Received: ${formatCurrency(receipt.paid_amount)}`,
    `Balance: ${formatCurrency(receipt.balance_amount)}`,
    `Payment Date: ${formatReceiptDate(receipt.payment_date)}`,
    `Payment Mode: ${receipt.payment_mode}`,
    `Collected By: ${receipt.collected_by}`,
    `Notes: ${receipt.notes || "-"}`,
    `Company / Business: ${receipt.company_name}`,
    `Tenant: ${receipt.tenant_id}`,
    `Data Scope: ${receipt.data_scope}`,
  ];
  const pdf = createSimplePdf(pdfText);
  const blob = new Blob([pdf], { type: "application/pdf" });

  return new File([blob], `${receipt.receipt_number}.pdf`, {
    type: "application/pdf",
  });
}

export function buildWhatsAppReceiptMessage(receipt) {
  return [
    `Receipt ${receipt.receipt_number}`,
    `Date & Time: ${formatReceiptDateTime(receipt.receipt_date_time)}`,
    `Member: ${receipt.member_name} (${receipt.member_number})`,
    `Mobile / WhatsApp: ${receipt.whatsapp_number || receipt.mobile_number || "-"}`,
    `Chit Group: ${receipt.chit_group}`,
    `Month: ${receipt.month}`,
    `Installment: ${formatCurrency(receipt.installment_amount)}`,
    `Fine: ${formatCurrency(receipt.fine_amount)}`,
    `Discount: ${formatCurrency(receipt.discount_amount)}`,
    `Dividend Adjustment: ${formatCurrency(receipt.dividend_adjustment)}`,
    `Amount Received: ${formatCurrency(receipt.paid_amount)}`,
    `Balance: ${formatCurrency(receipt.balance_amount)}`,
    `Date: ${formatReceiptDate(receipt.payment_date)}`,
    `Mode: ${receipt.payment_mode}`,
    `Collected By: ${receipt.collected_by}`,
    `Notes: ${receipt.notes || "-"}`,
    receipt.company_name,
  ].join("\n");
}

export function normalizeWhatsAppNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.length === 10 ? `91${digits}` : digits;
}

function formatReceiptDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatReceiptDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function createSimplePdf(lines) {
  const escapedLines = lines.map((line) =>
    String(line)
      .replaceAll("\\", "\\\\")
      .replaceAll("(", "\\(")
      .replaceAll(")", "\\)")
  );
  const content = [
    "BT",
    "/F1 18 Tf",
    "72 760 Td",
    "(Payment Successful) Tj",
    "/F1 12 Tf",
    "0 -34 Td",
    ...escapedLines.flatMap((line) => [`(${line}) Tj`, "0 -22 Td"]),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return pdf;
}
