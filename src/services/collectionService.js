import { CollectionEngine } from "../domain/chit/services/CollectionEngine";
import { ActivityRepository } from "../repositories/ActivityRepository";
import { CollectionsRepository } from "../repositories/CollectionsRepository";
import { NotificationRepository } from "../repositories/NotificationRepository";
import { createReceiptPayload, createReceiptImageUrl } from "../config/chitReceiptImage";
import { formatCurrency } from "../config/chitPhaseOneData";

export function getCollectionPageModel({ activeTenantContext, groups = [], members = [] } = {}) {
  const collections = CollectionsRepository.listCollections(activeTenantContext);
  const totalPaid = sum(collections, (collection) => collection.paid_amount);
  const totalPending = sum(collections, (collection) => collection.pending_amount);
  const partialCount = collections.filter((collection) => Number(collection.pending_amount || 0) > 0).length;

  return {
    collections,
    summary: [
      { label: "Collections Saved", value: collections.length },
      { label: "Total Paid", value: formatCurrency(totalPaid) },
      { label: "Total Balance", value: formatCurrency(totalPending) },
      { label: "Partial/Pending", value: partialCount },
    ],
    emptyState: {
      title: "No collections recorded yet",
      message: "Start with member search, choose chit and installment, then record the first payment.",
    },
    groupCount: groups.length,
    memberCount: members.length,
  };
}

export function buildCollectionDraft({ formData, members, groups, activeTenantContext } = {}) {
  const { collections, receipts } = CollectionsRepository.getSource(activeTenantContext);
  const member = members.find((item) => item.id === formData.member_id) || null;
  const group = groups.find((item) => item.id === formData.chit_group_id) || null;

  return CollectionEngine.buildDraft({
    formData,
    member,
    group,
    collections,
    receipts,
  });
}

export function recordCollectionPayment({
  formData,
  members,
  groups,
  activeTenantContext,
  companyName,
} = {}) {
  const draft = buildCollectionDraft({ formData, members, groups, activeTenantContext });

  if (!draft.validation.isValid) {
    return {
      success: false,
      draft,
      error: draft.validation.errors[0],
      message: draft.validation.errors[0],
    };
  }

  const now = new Date().toISOString();
  const collection = CollectionsRepository.saveCollection({
    id: `collection-${Date.now()}`,
    member_id: formData.member_id,
    group_id: formData.chit_group_id,
    chit_group_id: formData.chit_group_id,
    collection_month: formData.collection_month,
    installment_month: Number(formData.installment_month || 1),
    installment_amount: draft.installmentAmount,
    fine_amount: Number(formData.fine_amount || 0),
    discount_amount: Number(formData.discount_amount || 0),
    dividend_adjustment: Number(formData.dividend_adjustment || 0),
    paid_amount: draft.paidAmount,
    pending_amount: draft.pendingAmount,
    advance_amount: draft.advanceAmount,
    payment_date: formData.payment_date,
    payment_method: formData.payment_method,
    payment_type: draft.paymentType,
    collected_by: formData.collected_by,
    receipt_number: draft.receiptNumber,
    is_partial: draft.pendingAmount > 0,
    notes: formData.notes,
    created_at: now,
  }, activeTenantContext);
  const receipt = createReceiptPayload({
    collection,
    member: draft.member,
    group: draft.group,
    activeTenantContext,
    companyName,
  });

  persistReceipt({ collection, receipt, activeTenantContext, createdAt: now });
  persistFinanceEntry({ collection, receipt, activeTenantContext, createdAt: now });
  persistReportEntry({ collection, receipt, activeTenantContext, createdAt: now });
  persistActivity({ collection, receipt, activeTenantContext, createdAt: now });
  persistNotification({ collection, receipt, activeTenantContext, createdAt: now });

  return {
    success: true,
    collection,
    draft,
    receiptPreview: {
      receipt,
      imageUrl: createReceiptImageUrl(receipt),
    },
    message: "Collection saved, receipt generated, and downstream records updated.",
  };
}

function persistReceipt({ collection, receipt, activeTenantContext, createdAt }) {
  CollectionsRepository.saveReceipt({
    id: `receipt-${collection.id}`,
    receipt_number: collection.receipt_number,
    collection_id: collection.id,
    member_id: collection.member_id,
    group_id: collection.group_id,
    amount: collection.paid_amount,
    payment_date: collection.payment_date,
    payment_method: collection.payment_method,
    notes: collection.notes,
    can_print_pdf: true,
    can_print_whatsapp: true,
    created_at: createdAt,
    receipt_model: receipt,
  }, activeTenantContext);
}

function persistFinanceEntry({ collection, receipt, activeTenantContext, createdAt }) {
  const isBankMode = ["upi", "bank transfer", "cheque", "online"].includes(
    String(collection.payment_method || "").toLowerCase()
  );

  CollectionsRepository.saveFinanceEntry({
    id: `finance-${collection.id}`,
    type: "income",
    category: "Collection",
    particulars: receipt.receipt_number,
    description: `${receipt.member_name} - ${receipt.chit_name}`,
    amount: collection.paid_amount,
    cash_in: isBankMode ? 0 : collection.paid_amount,
    cash_out: 0,
    bank_in: isBankMode ? collection.paid_amount : 0,
    bank_out: 0,
    payment_mode: collection.payment_method,
    status: "Posted",
    receipt_no: receipt.receipt_number,
    date: collection.payment_date,
    created_at: createdAt,
  }, activeTenantContext);
}

function persistReportEntry({ collection, receipt, activeTenantContext, createdAt }) {
  CollectionsRepository.saveReportEntry({
    id: `collection-report-${collection.id}`,
    report_type: "Collection",
    report_name: "Collection Register",
    title: receipt.receipt_number,
    category: "Collections",
    status: collection.pending_amount > 0 ? "Partial" : "Paid",
    total_amount: collection.paid_amount,
    rows: [collection],
    generated_at: createdAt,
    created_at: createdAt,
  }, activeTenantContext);
}

function persistActivity({ collection, receipt, activeTenantContext, createdAt }) {
  ActivityRepository.addActivity({
    id: `activity-collection-${collection.id}`,
    title: "Collection posted",
    description: `${formatCurrency(collection.paid_amount)} received from ${receipt.member_name || "member"}.`,
    time: createdAt,
    icon: "Collection",
    route: "/chits/collections",
  }, activeTenantContext);
}

function persistNotification({ collection, receipt, activeTenantContext, createdAt }) {
  NotificationRepository.addNotification({
    id: `payment-received-${collection.id}`,
    title: "Payment received",
    message: `${formatCurrency(collection.paid_amount)} received for ${receipt.chit_name || "selected chit"}.`,
    type: "PAYMENT_RECEIVED",
    priority: collection.pending_amount > 0 ? "high" : "medium",
    createdAt,
    isRead: false,
    actionRoute: collection.pending_amount > 0 ? "/chits/collections/pending" : "/chits/collections",
  }, activeTenantContext);
}

function sum(rows, getter) {
  return rows.reduce((total, row) => total + Number(getter(row) || 0), 0);
}
