export const REPORT_FILTER_KEYS = {
  DATE_RANGE: "dateRange",
  GROUP: "groupId",
  MEMBER: "memberId",
  STAFF: "staffId",
  COLLECTION_STATUS: "collectionStatus",
  PAYMENT_MODE: "paymentMode",
  RECEIPT_STATUS: "receiptStatus",
  GROUP_STATUS: "groupStatus",
  AMOUNT: "amount",
};

export const DEFAULT_REPORT_FILTERS = {
  dateRange: { from: "", to: "" },
  groupId: "all",
  memberId: "all",
  staffId: "all",
  collectionStatus: "all",
  paymentMode: "all",
  receiptStatus: "all",
  groupStatus: "all",
  amount: { min: "", max: "" },
};

export function normalizeReportFilters(filters = {}) {
  return {
    ...DEFAULT_REPORT_FILTERS,
    ...filters,
    dateRange: {
      ...DEFAULT_REPORT_FILTERS.dateRange,
      ...(filters.dateRange || {}),
    },
    amount: {
      ...DEFAULT_REPORT_FILTERS.amount,
      ...(filters.amount || {}),
    },
  };
}

export function buildFilterOptions(source = {}) {
  return {
    groups: (source.groups || []).map((group) => ({
      value: group.id,
      label: group.chit_name || group.name || group.id,
    })),
    members: (source.members || []).map((member) => ({
      value: member.id,
      label: member.member_name || member.name || member.id,
    })),
    staff: uniqueOptions(source.collections || [], "collected_by"),
    collectionStatuses: uniqueOptions(source.collections || [], "status"),
    paymentModes: uniqueOptions(source.collections || [], "payment_method"),
    receiptStatuses: uniqueOptions(source.receipts || [], "status"),
    groupStatuses: uniqueOptions(source.groups || [], "status"),
  };
}

export function applyReportFilters(rows = [], filters = {}) {
  const normalized = normalizeReportFilters(filters);
  const minAmount = normalized.amount.min === "" ? null : Number(normalized.amount.min);
  const maxAmount = normalized.amount.max === "" ? null : Number(normalized.amount.max);

  return rows.filter((row) => {
    const rowDate = getComparableDate(row.date || row.paymentDate || row.createdAt || row.created_at);
    const fromDate = getComparableDate(normalized.dateRange.from);
    const toDate = getComparableDate(normalized.dateRange.to);
    const amount = Number(row.amount || row.paidAmount || row.pendingAmount || row.balance || 0);

    if (fromDate && rowDate && rowDate < fromDate) return false;
    if (toDate && rowDate && rowDate > toDate) return false;
    if (normalized.groupId !== "all" && row.groupId !== normalized.groupId) return false;
    if (normalized.memberId !== "all" && row.memberId !== normalized.memberId) return false;
    if (normalized.staffId !== "all" && row.staffId !== normalized.staffId) return false;
    if (normalized.collectionStatus !== "all" && row.status !== normalized.collectionStatus) return false;
    if (normalized.paymentMode !== "all" && row.paymentMode !== normalized.paymentMode) return false;
    if (normalized.receiptStatus !== "all" && row.receiptStatus !== normalized.receiptStatus) return false;
    if (normalized.groupStatus !== "all" && row.groupStatus !== normalized.groupStatus) return false;
    if (minAmount !== null && amount < minAmount) return false;
    if (maxAmount !== null && amount > maxAmount) return false;
    return true;
  });
}

function uniqueOptions(rows, field) {
  return [...new Set(rows.map((row) => row[field]).filter(Boolean))].map((value) => ({
    value,
    label: String(value).replace(/_/g, " "),
  }));
}

function getComparableDate(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 10);
}
