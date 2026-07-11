import { createReceiptImageLayout } from "./ReceiptImage";
import { generateReceiptNumber } from "./ReceiptNumberEngine";
import { createReceiptPDFLayout } from "./ReceiptPDF";
import { createReceiptPrintLayout } from "./ReceiptPrint";
import { RECEIPT_TEMPLATES, createReceiptTemplate } from "./ReceiptTemplate";
import { validateReceiptModel } from "./ReceiptValidator";
import { createWhatsAppShareLink } from "./ReceiptWhatsApp";

export function createReceiptModel({
  collection = {},
  member = {},
  group = {},
  source,
  createdBy = "VARDHAN Collector",
}) {
  const amountPaid = Number(collection.paid_amount || collection.amount || 0);
  const pendingAmount = Number(collection.pending_amount || 0);
  const totalPaid = Number(collection.total_paid || collection.totalPaid || amountPaid);
  const balance = pendingAmount;
  const receiptNumber = collection.receipt_number ||
    collection.receiptNumber ||
    generateReceiptNumber(source.receipts || []);

  return {
    id: `receipt-${collection.id || Date.now()}`,
    collectionId: collection.id || "",
    receiptNumber,
    tenantId: source.activeTenantContext?.tenant_id || collection.tenant_id || "",
    groupId: collection.chit_group_id || collection.group_id || group.id || "",
    memberId: collection.member_id || member.id || "",
    memberName: member.member_name || "Member",
    chitName: group.chit_name || "Chit Group",
    paymentDate: collection.payment_date || new Date().toISOString().slice(0, 10),
    paymentMode: collection.payment_method || collection.paymentMode || "Cash",
    installmentMonth: collection.collection_month || "",
    amountPaid,
    pendingAmount,
    totalPaid,
    balance,
    createdBy: collection.collected_by || createdBy,
    createdAt: collection.created_at || new Date().toISOString(),
    ownerBankDetails: source.ownerBankDetails,
    footerNote: source.footerNote,
    status: collection.receipt_status || collection.status || "active",
    reprintCount: Number(collection.reprint_count || collection.reprintCount || 0),
    lastPrintedAt: collection.last_printed_at || collection.lastPrintedAt || "",
  };
}

export const ReceiptEngine = {
  generateReceipt({ collection, member, group, source, createdBy }) {
    const receipt = createReceiptModel({ collection, member, group, source, createdBy });
    const validation = validateReceiptModel(receipt, source.receipts);

    return {
      receipt,
      validation,
      template: RECEIPT_TEMPLATES.ROYAL,
      previewHtml: createReceiptTemplate(receipt, RECEIPT_TEMPLATES.ROYAL),
    };
  },

  createPreview(receipt, template = RECEIPT_TEMPLATES.ROYAL) {
    return createReceiptTemplate(receipt, template);
  },

  createPrint(receipt, template = RECEIPT_TEMPLATES.ROYAL) {
    return createReceiptPrintLayout(receipt, template);
  },

  createPDF(receipt, template = RECEIPT_TEMPLATES.ROYAL) {
    return createReceiptPDFLayout(receipt, template);
  },

  createImage(receipt, template = RECEIPT_TEMPLATES.ROYAL) {
    return createReceiptImageLayout(receipt, template);
  },

  createWhatsApp(receipt, phoneNumber = "") {
    return createWhatsAppShareLink(receipt, phoneNumber);
  },

  validate(receipt, existingReceipts = [], options = {}) {
    return validateReceiptModel(receipt, existingReceipts, options);
  },
};
