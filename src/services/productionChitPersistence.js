/**
 * Production field maps and UUID helpers for MITRA NIDHI money-path entities.
 * Keeps Supabase payloads allowlisted to schema columns.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return UUID_RE.test(String(value || ""));
}

export function createEntityId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function toProductionMember(member = {}) {
  const payload = {
    group_id: member.group_id || member.chit_group_id,
    member_name: member.member_name || member.name || "",
    member_number: member.member_number || "",
    mobile_number: member.mobile_number || member.mobile || null,
    whatsapp_number: member.whatsapp_number || null,
    email: member.email || null,
    address: member.address || null,
    aadhaar_masked: member.aadhaar_masked || null,
    pan: member.pan || null,
    nominee_name: member.nominee_name || null,
    nominee_mobile: member.nominee_mobile || null,
    bank_name: member.bank_name || null,
    account_number_masked: member.account_number_masked || null,
    ifsc: member.ifsc || null,
    join_date: member.join_date || null,
    status: member.status || "active",
    metadata: {
      ...(member.metadata || {}),
      chit_group_id: member.chit_group_id || member.group_id,
    },
  };

  if (isUuid(member.id)) {
    payload.id = member.id;
  }

  return payload;
}

export function fromProductionMember(member = {}) {
  return {
    ...member,
    chit_group_id: member.chit_group_id || member.group_id || member.metadata?.chit_group_id,
    group_id: member.group_id || member.chit_group_id,
  };
}

export function toProductionCollection(collection = {}) {
  const receiptNo = collection.receipt_no || collection.receipt_number;
  const collectionDate = collection.collection_date || collection.payment_date;
  const payload = {
    group_id: collection.group_id || collection.chit_group_id,
    member_id: collection.member_id,
    collection_month: collection.collection_month,
    collection_date: collectionDate,
    installment_amount: Number(collection.installment_amount || 0),
    fine_amount: Number(collection.fine_amount || 0),
    discount_amount: Number(collection.discount_amount || 0),
    dividend_adjustment: Number(collection.dividend_adjustment || 0),
    paid_amount: Number(collection.paid_amount || 0),
    pending_amount: Number(collection.pending_amount || 0),
    payment_method: collection.payment_method || "Cash",
    collected_by: collection.collected_by || null,
    receipt_no: receiptNo,
    is_partial: Boolean(collection.is_partial),
    notes: collection.notes || null,
    status: collection.status || "posted",
    metadata: {
      ...(collection.metadata || {}),
      installment_month: collection.installment_month ?? collection.metadata?.installment_month,
      advance_amount: collection.advance_amount ?? collection.metadata?.advance_amount,
      payment_type: collection.payment_type ?? collection.metadata?.payment_type,
      chit_group_id: collection.chit_group_id || collection.group_id,
    },
  };

  if (isUuid(collection.id)) {
    payload.id = collection.id;
  }

  return payload;
}

export function fromProductionCollection(collection = {}) {
  return {
    ...collection,
    receipt_number: collection.receipt_number || collection.receipt_no,
    payment_date: collection.payment_date || collection.collection_date,
    chit_group_id: collection.chit_group_id || collection.group_id || collection.metadata?.chit_group_id,
    installment_month:
      collection.installment_month ?? collection.metadata?.installment_month ?? 1,
    advance_amount: collection.advance_amount ?? collection.metadata?.advance_amount ?? 0,
    payment_type: collection.payment_type ?? collection.metadata?.payment_type,
  };
}

export function toProductionReceipt(receipt = {}) {
  const payload = {
    collection_id: receipt.collection_id,
    group_id: receipt.group_id || receipt.chit_group_id,
    member_id: receipt.member_id,
    receipt_no: receipt.receipt_no || receipt.receipt_number,
    amount: Number(receipt.amount || receipt.amountPaid || 0),
    payment_date: receipt.payment_date || receipt.collection_date,
    payment_method: receipt.payment_method || receipt.paymentMode || "Cash",
    can_print_pdf: receipt.can_print_pdf !== false,
    can_print_whatsapp: receipt.can_print_whatsapp !== false,
    document_url: receipt.document_url || null,
    notes: receipt.notes || null,
    status: receipt.status || "ready",
    metadata: {
      ...(receipt.metadata || {}),
      receipt_model: receipt.receipt_model || receipt.metadata?.receipt_model,
    },
  };

  if (isUuid(receipt.id)) {
    payload.id = receipt.id;
  }

  return payload;
}

export function fromProductionReceipt(receipt = {}) {
  return {
    ...receipt,
    receipt_number: receipt.receipt_number || receipt.receipt_no,
  };
}

export function toProductionFinanceEntry(entry = {}) {
  const payload = {
    group_id: entry.group_id || null,
    member_id: entry.member_id || null,
    collection_id: entry.collection_id || null,
    receipt_no: entry.receipt_no || entry.receipt_number || null,
    entry_date: entry.entry_date || entry.date || new Date().toISOString().slice(0, 10),
    entry_type: entry.entry_type || entry.type || "income",
    category: entry.category || null,
    particulars: entry.particulars || null,
    description: entry.description || null,
    amount: Number(entry.amount || 0),
    cash_in: Number(entry.cash_in || entry.cashIn || 0),
    cash_out: Number(entry.cash_out || entry.cashOut || 0),
    bank_in: Number(entry.bank_in || entry.bankIn || 0),
    bank_out: Number(entry.bank_out || entry.bankOut || 0),
    balance: Number(entry.balance || 0),
    payment_mode: entry.payment_mode || entry.paymentMode || null,
    status: normalizeFinanceStatus(entry.status),
    metadata: entry.metadata || {},
  };

  if (isUuid(entry.id)) {
    payload.id = entry.id;
  }

  return payload;
}

export function fromProductionFinanceEntry(entry = {}) {
  return {
    ...entry,
    type: entry.type || entry.entry_type,
    date: entry.date || entry.entry_date,
    receipt_number: entry.receipt_number || entry.receipt_no,
  };
}

function normalizeFinanceStatus(status) {
  const value = String(status || "posted").trim().toLowerCase();
  if (value === "obligation") return "obligation";
  if (value === "void" || value === "cancelled") return "void";
  return "posted";
}
