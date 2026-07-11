import { WorkspaceRepository } from "./WorkspaceRepository";
import {
  CollectionsRepository,
  GroupsRepository,
  MembersRepository,
  ReceiptsRepository,
} from "./chits";

const OWNER_BANK_DETAILS = {
  accountName: "VARDHAN Own Chit Business",
  bankName: "State Bank Operating Account",
  accountNumber: "XXXXXX7890",
  ifsc: "SBIN0001234",
  upiId: "vardhan@upi",
};

export const ReceiptRepository = {
  getReceiptSource(activeTenantContext) {
    const context = activeTenantContext || WorkspaceRepository.getCurrentWorkspaceContext();

    return {
      activeTenantContext: context,
      collections: listRows(CollectionsRepository, context),
      groups: listRows(GroupsRepository, context),
      members: listRows(MembersRepository, context),
      receipts: listRows(ReceiptsRepository, context),
      ownerBankDetails: OWNER_BANK_DETAILS,
      footerNote: "Thank you for your payment. This is a system generated receipt.",
    };
  },

  listReceipts(activeTenantContext) {
    const source = this.getReceiptSource(activeTenantContext);
    const savedReceipts = source.receipts.map((receipt) => normalizeReceiptModel(receipt, source));
    const savedCollectionIds = new Set(savedReceipts.map((receipt) => receipt.collectionId).filter(Boolean));
    const fallbackReceipts = source.collections
      .filter((collection) => collection.receipt_number && !savedCollectionIds.has(collection.id))
      .map((collection) => {
        const member = source.members.find((item) => item.id === collection.member_id) || {};
        const group = source.groups.find((item) =>
          item.id === collection.chit_group_id || item.id === collection.group_id || item.id === member.chit_group_id
        ) || {};

        return normalizeCollectionReceipt(collection, member, group, source);
      });

    return [...savedReceipts, ...fallbackReceipts]
      .sort((a, b) => new Date(b.createdAt || b.paymentDate || 0) - new Date(a.createdAt || a.paymentDate || 0));
  },

  getReceiptById(receiptId, activeTenantContext) {
    return this.listReceipts(activeTenantContext).find((receipt) => receipt.id === receiptId) || null;
  },

  isDuplicateReceipt(receiptNumber, activeTenantContext) {
    return this.listReceipts(activeTenantContext).some(
      (receipt) => receipt.receipt_number === receiptNumber || receipt.receiptNumber === receiptNumber
    );
  },

  saveReceipt(receipt, activeTenantContext) {
    const context = activeTenantContext || WorkspaceRepository.getCurrentWorkspaceContext();
    const repositoryReceipt = {
      id: receipt.id,
      receipt_number: receipt.receiptNumber,
      collection_id: receipt.collectionId,
      member_id: receipt.memberId,
      group_id: receipt.groupId,
      amount: receipt.amountPaid,
      payment_date: receipt.paymentDate,
      payment_method: receipt.paymentMode,
      notes: receipt.footerNote,
      can_print_pdf: true,
      can_print_whatsapp: true,
      created_at: receipt.createdAt,
      receipt_model: receipt,
      reprint_count: Number(receipt.reprintCount || 0),
      last_printed_at: receipt.lastPrintedAt || "",
      status: receipt.status || "active",
    };

    return ReceiptsRepository.upsert(repositoryReceipt, { activeTenantContext: context });
  },

  trackReprint(receiptId, activeTenantContext) {
    const context = activeTenantContext || WorkspaceRepository.getCurrentWorkspaceContext();
    const current = ReceiptsRepository.getById(receiptId, { activeTenantContext: context });

    if (!current) {
      return null;
    }

    const receiptModel = normalizeReceiptModel(current, this.getReceiptSource(context));
    const nextReceipt = {
      ...receiptModel,
      reprintCount: Number(receiptModel.reprintCount || 0) + 1,
      lastPrintedAt: new Date().toISOString(),
    };

    this.saveReceipt(nextReceipt, context);
    return nextReceipt;
  },
};

function listRows(repository, activeTenantContext) {
  if (!activeTenantContext?.tenant_id || !activeTenantContext?.data_scope) {
    return [];
  }

  return repository.list({
    activeTenantContext,
    pageSize: Number.MAX_SAFE_INTEGER,
  }).data;
}

function normalizeReceiptModel(receipt, source) {
  if (receipt.receipt_model?.receiptNumber) {
    return {
      ...receipt.receipt_model,
      id: receipt.id || receipt.receipt_model.id,
      receiptNumber: receipt.receipt_number || receipt.receipt_model.receiptNumber,
      reprintCount: Number(receipt.reprint_count || receipt.receipt_model.reprintCount || 0),
      lastPrintedAt: receipt.last_printed_at || receipt.receipt_model.lastPrintedAt || "",
      status: receipt.status || receipt.receipt_model.status || "active",
    };
  }

  if (receipt.receipt_model?.receipt_number) {
    const model = receipt.receipt_model;
    return {
      id: receipt.id,
      collectionId: receipt.collection_id || "",
      receiptNumber: receipt.receipt_number || model.receipt_number,
      tenantId: receipt.tenant_id || model.tenant_id || source.activeTenantContext?.tenant_id || "",
      groupId: receipt.group_id || "",
      memberId: receipt.member_id || "",
      memberName: model.member_name || "Member",
      chitName: model.chit_group || "Chit Group",
      paymentDate: receipt.payment_date || model.payment_date || "",
      paymentMode: receipt.payment_method || model.payment_mode || "Cash",
      installmentMonth: model.month || "",
      amountPaid: Number(receipt.amount || model.paid_amount || 0),
      pendingAmount: Number(model.balance_amount || 0),
      totalPaid: Number(receipt.amount || model.paid_amount || 0),
      balance: Number(model.balance_amount || 0),
      createdBy: model.collected_by || "VARDHAN Collector",
      createdAt: receipt.created_at || model.receipt_date_time || "",
      ownerBankDetails: source.ownerBankDetails,
      footerNote: receipt.notes || source.footerNote,
      status: receipt.status || "active",
      reprintCount: Number(receipt.reprint_count || 0),
      lastPrintedAt: receipt.last_printed_at || "",
    };
  }

  return {
    id: receipt.id,
    collectionId: receipt.collection_id || "",
    receiptNumber: receipt.receipt_number || "",
    tenantId: receipt.tenant_id || source.activeTenantContext?.tenant_id || "",
    groupId: receipt.group_id || "",
    memberId: receipt.member_id || "",
    memberName: "Member",
    chitName: "Chit Group",
    paymentDate: receipt.payment_date || "",
    paymentMode: receipt.payment_method || "Cash",
    installmentMonth: "",
    amountPaid: Number(receipt.amount || 0),
    pendingAmount: 0,
    totalPaid: Number(receipt.amount || 0),
    balance: 0,
    createdBy: "VARDHAN Collector",
    createdAt: receipt.created_at || "",
    ownerBankDetails: source.ownerBankDetails,
    footerNote: receipt.notes || source.footerNote,
    status: receipt.status || "active",
    reprintCount: Number(receipt.reprint_count || 0),
    lastPrintedAt: receipt.last_printed_at || "",
  };
}

function normalizeCollectionReceipt(collection, member, group, source) {
  return {
    id: `receipt-${collection.id}`,
    collectionId: collection.id || "",
    receiptNumber: collection.receipt_number,
    tenantId: collection.tenant_id || source.activeTenantContext?.tenant_id || "",
    groupId: collection.chit_group_id || collection.group_id || group.id || "",
    memberId: collection.member_id || member.id || "",
    memberName: member.member_name || "Member",
    chitName: group.chit_name || "Chit Group",
    paymentDate: collection.payment_date || "",
    paymentMode: collection.payment_method || "Cash",
    installmentMonth: collection.collection_month || collection.installment_month || "",
    amountPaid: Number(collection.paid_amount || 0),
    pendingAmount: Number(collection.pending_amount || 0),
    totalPaid: Number(collection.paid_amount || 0),
    balance: Number(collection.pending_amount || 0),
    createdBy: collection.collected_by || "VARDHAN Collector",
    createdAt: collection.created_at || "",
    ownerBankDetails: source.ownerBankDetails,
    footerNote: source.footerNote,
    status: collection.receipt_status || "active",
    reprintCount: Number(collection.reprint_count || 0),
    lastPrintedAt: collection.last_printed_at || "",
  };
}
