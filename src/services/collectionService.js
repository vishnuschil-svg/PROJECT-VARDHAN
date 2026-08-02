import { CollectionEngine } from "../domain/chit/services/CollectionEngine.js";
import { ActivityRepository } from "../repositories/ActivityRepository.js";
import { CollectionsRepository } from "../repositories/CollectionsRepository.js";
import { NotificationRepository } from "../repositories/NotificationRepository.js";
import { createReceiptPayload, createReceiptImageUrl } from "../config/chitReceiptImage.js";
import { formatCurrency } from "../config/chitPhaseOneData.js";
import {
  isProductionRepositoryMode,
  listTenantCollectionsPersistent,
  listTenantReceiptsPersistent,
  saveCollectionRecordPersistent,
  saveFinanceEntryPersistent,
  saveReceiptRecordPersistent,
} from "./chitDataService.js";
import { createEntityId } from "./productionChitPersistence.js";
import { notifyCollectionsChanged } from "./chitCollectionsStore.js";

export function getCollectionPageModel({
  activeTenantContext,
  groups = [],
  members = [],
  collections,
} = {}) {
  const rows =
    collections ||
    CollectionsRepository.listCollections(activeTenantContext);
  const totalPaid = sum(rows, (collection) => collection.paid_amount);
  const totalPending = sum(rows, (collection) => collection.pending_amount);
  const partialCount = rows.filter((collection) => Number(collection.pending_amount || 0) > 0).length;

  return {
    collections: rows,
    summary: [
      { label: "Collections Saved", value: rows.length },
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

export function buildCollectionDraft({
  formData,
  members,
  groups,
  activeTenantContext,
  collections,
  receipts,
} = {}) {
  const source =
    collections || receipts
      ? {
          collections: collections || [],
          receipts: receipts || [],
        }
      : CollectionsRepository.getSource(activeTenantContext);
  const member = members.find((item) => item.id === formData.member_id) || null;
  const group = groups.find((item) => item.id === formData.chit_group_id) || null;

  return CollectionEngine.buildDraft({
    formData,
    member,
    group,
    collections: source.collections,
    receipts: source.receipts,
  });
}

export async function recordCollectionPayment({
  formData,
  members,
  groups,
  activeTenantContext,
  companyName,
  collections,
  receipts,
} = {}) {
  const existingCollections =
    collections ||
    (isProductionRepositoryMode()
      ? await listTenantCollectionsPersistent(activeTenantContext)
      : CollectionsRepository.listCollections(activeTenantContext));
  const existingReceipts =
    receipts ||
    (isProductionRepositoryMode()
      ? await listTenantReceiptsPersistent(activeTenantContext)
      : CollectionsRepository.listReceipts(activeTenantContext));

  const draft = buildCollectionDraft({
    formData,
    members,
    groups,
    activeTenantContext,
    collections: existingCollections,
    receipts: existingReceipts,
  });

  if (!draft.validation.isValid) {
    return {
      success: false,
      draft,
      error: draft.validation.errors[0],
      message: draft.validation.errors[0],
    };
  }

  const now = new Date().toISOString();
  const collectionId = isProductionRepositoryMode()
    ? createEntityId()
    : `collection-${Date.now()}`;
  const collectionPayload = {
    id: collectionId,
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
    collection_date: formData.payment_date,
    payment_method: formData.payment_method,
    payment_type: draft.paymentType,
    collected_by: formData.collected_by,
    receipt_number: draft.receiptNumber,
    receipt_no: draft.receiptNumber,
    is_partial: draft.pendingAmount > 0,
    notes: formData.notes,
    created_at: now,
  };

  const collection = isProductionRepositoryMode()
    ? await saveCollectionRecordPersistent(collectionPayload, activeTenantContext)
    : CollectionsRepository.saveCollection(collectionPayload, activeTenantContext);

  const receipt = createReceiptPayload({
    collection,
    member: draft.member,
    group: draft.group,
    activeTenantContext,
    companyName,
  });

  await persistReceipt({ collection, receipt, activeTenantContext, createdAt: now });
  await persistFinanceEntry({ collection, receipt, activeTenantContext, createdAt: now });
  persistReportEntry({ collection, receipt, activeTenantContext, createdAt: now });
  persistActivity({ collection, receipt, activeTenantContext, createdAt: now });
  persistNotification({ collection, receipt, activeTenantContext, createdAt: now });
  notifyCollectionsChanged();

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

async function persistReceipt({ collection, receipt, activeTenantContext, createdAt }) {
  const payload = {
    id: isProductionRepositoryMode() ? createEntityId() : `receipt-${collection.id}`,
    receipt_number: collection.receipt_number || collection.receipt_no,
    receipt_no: collection.receipt_number || collection.receipt_no,
    collection_id: collection.id,
    member_id: collection.member_id,
    group_id: collection.group_id || collection.chit_group_id,
    amount: collection.paid_amount,
    payment_date: collection.payment_date || collection.collection_date,
    payment_method: collection.payment_method,
    notes: collection.notes,
    can_print_pdf: true,
    can_print_whatsapp: true,
    created_at: createdAt,
    receipt_model: receipt,
  };

  if (isProductionRepositoryMode()) {
    return saveReceiptRecordPersistent(payload, activeTenantContext);
  }

  return CollectionsRepository.saveReceipt(payload, activeTenantContext);
}

async function persistFinanceEntry({ collection, receipt, activeTenantContext, createdAt }) {
  const isBankMode = ["upi", "bank transfer", "cheque", "online"].includes(
    String(collection.payment_method || "").toLowerCase()
  );
  const payload = {
    id: isProductionRepositoryMode() ? createEntityId() : `finance-${collection.id}`,
    type: "income",
    entry_type: "income",
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
    date: collection.payment_date || collection.collection_date,
    entry_date: collection.payment_date || collection.collection_date,
    group_id: collection.group_id || collection.chit_group_id,
    member_id: collection.member_id,
    collection_id: collection.id,
    created_at: createdAt,
  };

  if (isProductionRepositoryMode()) {
    return saveFinanceEntryPersistent(payload, activeTenantContext);
  }

  return CollectionsRepository.saveFinanceEntry(payload, activeTenantContext);
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
