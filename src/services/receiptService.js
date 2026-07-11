import { ReceiptRepository } from "../repositories/ReceiptRepository";
import { ReceiptEngine } from "../receipts/ReceiptEngine";
import { RECEIPT_TEMPLATES } from "../receipts/ReceiptTemplate";

export { RECEIPT_TEMPLATES };

export function generateReceipt({ collectionId, activeTenantContext, createdBy } = {}) {
  const source = ReceiptRepository.getReceiptSource(activeTenantContext);
  const collection = source.collections.find((item) => item.id === collectionId) ||
    source.collections.find((item) => item.receipt_number && !source.receipts.some((receipt) => receipt.collection_id === item.id)) ||
    source.collections[0] ||
    {};
  const member = source.members.find((item) => item.id === collection.member_id) || {};
  const group = source.groups.find((item) =>
    item.id === collection.chit_group_id || item.id === collection.group_id || item.id === member.chit_group_id
  ) || {};
  const result = ReceiptEngine.generateReceipt({ collection, member, group, source, createdBy });

  if (result.validation.isValid) {
    ReceiptRepository.saveReceipt(result.receipt, activeTenantContext);
  }

  return result;
}

export function previewReceipt(receipt, template) {
  return ReceiptEngine.createPreview(receipt, template);
}

export function getReceiptActions(receipt, template = RECEIPT_TEMPLATES.ROYAL) {
  return {
    printHtml: ReceiptEngine.createPrint(receipt, template),
    pdf: ReceiptEngine.createPDF(receipt, template),
    image: ReceiptEngine.createImage(receipt, template),
    whatsappLink: ReceiptEngine.createWhatsApp(receipt),
  };
}

export function listProductionReceipts(activeTenantContext) {
  return ReceiptRepository.listReceipts(activeTenantContext);
}

export function getReceiptPageModel(activeTenantContext) {
  const receipts = listProductionReceipts(activeTenantContext);
  const totalAmount = receipts.reduce((sum, receipt) => sum + Number(receipt.amountPaid || 0), 0);
  const printableCount = receipts.filter((receipt) => receipt.status !== "cancelled").length;

  return {
    receipts,
    summary: [
      { label: "Total Receipts", value: receipts.length },
      { label: "Receipt Value", value: totalAmount },
      { label: "Print Ready", value: printableCount },
      { label: "Reprints", value: receipts.reduce((sum, receipt) => sum + Number(receipt.reprintCount || 0), 0) },
    ],
    emptyState: {
      title: "No receipts generated yet",
      message: "Receipts appear automatically after collection success, or can be generated from saved collections.",
    },
  };
}

export function validateReceiptForAction(receipt, activeTenantContext, options = {}) {
  const source = ReceiptRepository.getReceiptSource(activeTenantContext);
  return ReceiptEngine.validate(receipt, source.receipts, options);
}

export function trackReceiptReprint(receipt, activeTenantContext) {
  const validation = validateReceiptForAction(receipt, activeTenantContext);

  if (!validation.isValid) {
    return {
      success: false,
      validation,
      message: validation.errors[0],
    };
  }

  const updatedReceipt = ReceiptRepository.trackReprint(receipt.id, activeTenantContext) || {
    ...receipt,
    reprintCount: Number(receipt.reprintCount || 0) + 1,
    lastPrintedAt: new Date().toISOString(),
  };

  return {
    success: true,
    receipt: updatedReceipt,
    validation,
    message: "Receipt reprint tracked.",
  };
}
