import { applyReportFilters, normalizeReportFilters } from "./ReportFilters";

export const REPORT_MODULES = {
  CHIT: "MITRA_NIDHI_CHITI_PRO",
  SCHOOL: "SCHOOL_ERP",
  COLLEGE: "COLLEGE_ERP",
  HOSTELS: "PRIVATE_HOSTELS_ERP",
};

export const DEFAULT_REPORTS = [
  createDefinition("business-summary", "Business Summary", "Executive overview across collections, members, cash flow, and pending risk.", "Summary"),
  createDefinition("daily-collection", "Daily Collection Report", "Day-wise collection rollup.", "Collections"),
  createDefinition("weekly-collection", "Weekly Collection Report", "Week-wise collection rollup.", "Collections"),
  createDefinition("monthly-collection", "Monthly Collection Report", "Month-wise collection rollup.", "Collections"),
  createDefinition("yearly-collection", "Yearly Collection Report", "Year-wise collection rollup.", "Collections"),
  createDefinition("pending-collection-report", "Pending Collection Report", "Pending exposure by member and group.", "Collections"),
  createDefinition("member-ledger", "Member Ledger", "Member-wise collection and balance ledger.", "Members"),
  createDefinition("member-passbook", "Member Passbook", "Passbook-ready member payment history.", "Members"),
  createDefinition("chit-group-summary", "Chit Group Summary", "Group value, member count, collection and pending position.", "Groups"),
  createDefinition("auction-report", "Auction Report", "Auction history, winner, bid, and dividend movement.", "Auctions"),
  createDefinition("lucky-draw-report", "Lucky Draw Report", "Lucky draw and winner tracking report.", "Auctions"),
  createDefinition("receipt-register", "Receipt Register", "Generated receipt audit register.", "Receipts"),
  createDefinition("cash-book", "Cash Book Report", "Cash inflow and outflow register.", "Finance"),
  createDefinition("bank-book", "Bank Book Report", "Bank inflow and outflow register.", "Finance"),
  createDefinition("income-report", "Income Report", "Collection income and credited finance entries.", "Finance"),
  createDefinition("expense-report", "Expense Report", "Expense and debited finance entries.", "Finance"),
  createDefinition("commission-report", "Commission Report", "Auction commission register.", "Finance"),
  createDefinition("profit-report", "Profit Report", "Income, expense, commission and pending-aware profit.", "Finance"),
  createDefinition("inactive-members", "Inactive Members", "Members needing reactivation or data review.", "Members"),
  createDefinition("top-paying-members", "Top Paying Members", "Highest value members by paid collections.", "Members"),
  createDefinition("staff-collection-report", "Staff Collection Report", "Collection performance grouped by staff.", "Collections"),
];

export function getDefaultReportDefinitions() {
  return DEFAULT_REPORTS.map((report) => ({ ...report }));
}

export function buildEnterpriseReport({ reportId, source, filters = {} }) {
  const definition = DEFAULT_REPORTS.find((report) => report.id === reportId) || DEFAULT_REPORTS[0];
  const normalizedFilters = normalizeReportFilters(filters);
  const rawRows = buildRows(definition.id, source);
  const rows = applyReportFilters(rawRows, normalizedFilters);
  const totals = buildTotals(rows);

  return {
    id: definition.id,
    title: definition.title,
    category: definition.category,
    description: definition.description,
    module: source.tenantContext?.module || source.workspace?.module || REPORT_MODULES.CHIT,
    generatedAt: new Date().toISOString(),
    filters: normalizedFilters,
    columns: getColumnsForReport(definition.id),
    rows,
    totals,
    status: rows.length ? "Ready" : "No data",
  };
}

export function buildReportsCatalog(source = {}) {
  const stats = buildDashboardStats(source);

  return DEFAULT_REPORTS.map((report) => ({
    ...report,
    route: "/chits/reports",
    status: stats.isReady ? "Ready" : "Setup",
    metrics: getCardMetrics(report.id, stats),
  }));
}

export function buildDashboardStats(source = {}) {
  const collections = source.collections || [];
  const financeEntries = source.financeEntries || [];
  const collectionTotal = sum(collections, (collection) => collection.paid_amount);
  const pendingTotal = sum(collections, (collection) => collection.pending_amount)
    || sum(source.groups || [], (group) => group.pending_collections);
  const income = sum(financeEntries.filter(isIncomeEntry), (entry) => entry.amount || entry.cash_in || entry.bank_in);
  const expense = sum(financeEntries.filter(isExpenseEntry), (entry) => entry.amount || entry.cash_out || entry.bank_out);

  return {
    isReady: Boolean((source.groups || []).length || (source.members || []).length),
    activeGroups: (source.groups || []).filter((group) => group.status === "active").length,
    members: (source.members || []).length,
    collectionTotal,
    pendingTotal,
    receipts: (source.receipts || []).length,
    auctions: (source.auctions || []).length,
    profit: collectionTotal + income - expense - pendingTotal,
  };
}

function buildRows(reportId, source = {}) {
  const builders = {
    "business-summary": () => buildBusinessSummaryRows(source),
    "collection-report": () => buildCollectionRows(source.collections),
    "pending-collection-report": () => buildPendingRows(source),
    "member-ledger": () => buildMemberLedgerRows(source),
    "member-passbook": () => buildMemberPassbookRows(source),
    "chit-group-summary": () => buildGroupSummaryRows(source),
    "auction-report": () => buildAuctionRows(source),
    "lucky-draw-report": () => buildAuctionRows(source).filter((row) => row.type === "lucky draw" || row.title.toLowerCase().includes("draw")),
    "profit-loss": () => buildProfitRows(source),
    "profit-report": () => buildProfitRows(source),
    "cash-book": () => buildFinanceBookRows(source.financeEntries, "cash"),
    "bank-book": () => buildFinanceBookRows(source.financeEntries, "bank"),
    "income-report": () => buildIncomeRows(source),
    "expense-report": () => buildExpenseRows(source),
    "commission-report": () => buildCommissionRows(source),
    "receipt-register": () => buildReceiptRows(source),
    "daily-collection": () => buildCollectionRollupRows(source.collections, "day"),
    "weekly-collection": () => buildCollectionRollupRows(source.collections, "week"),
    "monthly-collection": () => buildCollectionRollupRows(source.collections, "month"),
    "yearly-collection": () => buildCollectionRollupRows(source.collections, "year"),
    "top-paying-members": () => buildTopCustomerRows(source),
    "top-customers": () => buildTopCustomerRows(source),
    "inactive-members": () => buildInactiveMemberRows(source.members),
    "staff-collection-report": () => buildStaffCollectionRows(source),
  };

  return (builders[reportId] || builders["business-summary"])();
}

function buildBusinessSummaryRows(source) {
  const stats = buildDashboardStats(source);

  return [
    createMetricRow("activeGroups", "Active Groups", stats.activeGroups),
    createMetricRow("members", "Members", stats.members),
    createMetricRow("collectionTotal", "Collection Total", stats.collectionTotal),
    createMetricRow("pendingTotal", "Pending Total", stats.pendingTotal),
    createMetricRow("receipts", "Receipts", stats.receipts),
    createMetricRow("profit", "Profit Trend", stats.profit),
  ];
}

function buildCollectionRows(collections = []) {
  return collections.map((collection) => ({
    id: collection.id,
    date: collection.payment_date || collection.created_at,
    title: collection.receipt_number || collection.collection_month || "Collection",
    groupId: collection.group_id || collection.chit_group_id,
    memberId: collection.member_id,
    staffId: collection.collected_by || "unassigned",
    paymentMode: collection.payment_method || "cash",
    status: collection.status || (Number(collection.pending_amount || 0) > 0 ? "partial" : "paid"),
    amount: Number(collection.paid_amount || 0),
    pendingAmount: Number(collection.pending_amount || 0),
    groupStatus: collection.group_status || "",
  }));
}

function buildPendingRows(source) {
  const collectionRows = buildCollectionRows(source.collections)
    .filter((row) => Number(row.pendingAmount || 0) > 0)
    .map((row) => ({ ...row, amount: row.pendingAmount, status: "pending" }));

  if (collectionRows.length) {
    return collectionRows;
  }

  return (source.groups || [])
    .filter((group) => Number(group.pending_collections || 0) > 0)
    .map((group) => ({
      id: group.id,
      title: group.chit_name || group.chit_code || "Pending group",
      groupId: group.id,
      status: "pending",
      amount: Number(group.pending_collections || 0),
      pendingAmount: Number(group.pending_collections || 0),
    }));
}

function buildMemberLedgerRows(source) {
  const collections = buildCollectionRows(source.collections);

  return (source.members || []).map((member) => {
    const memberCollections = collections.filter((collection) => collection.memberId === member.id);
    const paidAmount = sum(memberCollections, (collection) => collection.amount);
    const pendingAmount = sum(memberCollections, (collection) => collection.pendingAmount);

    return {
      id: member.id,
      title: member.member_name || member.name || member.id,
      memberId: member.id,
      groupId: member.group_id || member.chit_group_id,
      status: member.status || "active",
      amount: paidAmount,
      pendingAmount,
      balance: pendingAmount,
    };
  });
}

function buildMemberPassbookRows(source) {
  const members = source.members || [];
  return buildCollectionRows(source.collections).map((collection) => {
    const member = members.find((item) => item.id === collection.memberId) || {};

    return {
      ...collection,
      title: member.member_name || collection.title,
      memberNumber: member.member_number || "",
      balance: collection.pendingAmount,
    };
  });
}

function buildGroupSummaryRows(source) {
  const collections = buildCollectionRows(source.collections);

  return (source.groups || []).map((group) => {
    const groupCollections = collections.filter((collection) => collection.groupId === group.id);

    return {
      id: group.id,
      title: group.chit_name || group.chit_code || group.id,
      groupId: group.id,
      groupStatus: group.status || "active",
      status: group.status || "active",
      memberCount: Number(group.total_members || group.members_count || 0),
      amount: Number(group.chit_value || group.total_value || 0),
      collectionAmount: sum(groupCollections, (collection) => collection.amount),
      pendingAmount: sum(groupCollections, (collection) => collection.pendingAmount) || Number(group.pending_collections || 0),
    };
  });
}

function buildAuctionRows(source) {
  return (source.auctions || []).map((auction) => ({
    id: auction.id,
    date: auction.auction_date || auction.created_at,
    title: auction.notes || `Auction ${auction.auction_month || ""}`.trim(),
    groupId: auction.group_id || auction.chit_group_id,
    memberId: auction.winner_member_id,
    status: auction.status || "scheduled",
    type: String(auction.type || "").toLowerCase(),
    amount: Number(auction.bid_amount || auction.lift_amount || 0),
    dividendAmount: Number(auction.dividend_amount || 0),
  }));
}

function buildProfitRows(source) {
  const financeRows = source.financeEntries || [];
  const income = sum(financeRows.filter(isIncomeEntry), (entry) => entry.amount || entry.cash_in || entry.bank_in);
  const expense = sum(financeRows.filter(isExpenseEntry), (entry) => entry.amount || entry.cash_out || entry.bank_out);
  const collectionTotal = sum(source.collections || [], (collection) => collection.paid_amount);
  const pendingTotal = sum(source.collections || [], (collection) => collection.pending_amount);
  const commission = sum(buildCommissionRows(source), (entry) => entry.amount);

  return [
    createMetricRow("collections", "Collections", collectionTotal),
    createMetricRow("income", "Other Income", income),
    createMetricRow("expense", "Expenses", expense),
    createMetricRow("commission", "Commission", commission),
    createMetricRow("pending", "Pending", pendingTotal),
    createMetricRow("net", "Net Profit", collectionTotal + income + commission - expense - pendingTotal),
  ];
}

function buildFinanceBookRows(financeEntries = [], mode) {
  return financeEntries
    .filter((entry) => mode === "cash" ? Number(entry.cash_in || entry.cash_out || 0) > 0 : Number(entry.bank_in || entry.bank_out || 0) > 0)
    .map((entry) => ({
    id: entry.id,
    date: entry.date || entry.created_at,
    title: entry.particulars || entry.description || entry.category || "Finance entry",
    paymentMode: entry.payment_mode || mode,
    status: entry.status || "posted",
    amount: Number(mode === "cash" ? entry.cash_in || entry.cash_out || entry.amount : entry.bank_in || entry.bank_out || entry.amount),
    balance: Number(entry.balance || 0),
  }));
}

function buildIncomeRows(source) {
  return [
    ...buildCollectionRows(source.collections).map((collection) => ({
      ...collection,
      category: "Collection",
      receiptStatus: "generated",
    })),
    ...(source.financeEntries || []).filter(isIncomeEntry).map((entry) => ({
      id: entry.id,
      date: entry.date || entry.created_at,
      title: entry.particulars || entry.description || entry.category || "Income",
      paymentMode: entry.payment_mode || "",
      status: entry.status || "posted",
      amount: Number(entry.amount || entry.cash_in || entry.bank_in || 0),
    })),
  ];
}

function buildExpenseRows(source) {
  return (source.financeEntries || []).filter(isExpenseEntry).map((entry) => ({
    id: entry.id,
    date: entry.date || entry.created_at,
    title: entry.particulars || entry.description || entry.category || "Expense",
    paymentMode: entry.payment_mode || "",
    status: entry.status || "posted",
    amount: Number(entry.amount || entry.cash_out || entry.bank_out || 0),
  }));
}

function buildCommissionRows(source) {
  return (source.auctions || []).map((auction) => {
    const amount = Math.round((Number(auction.bid_amount || auction.lift_amount || 0) * 5) / 100);
    return {
      id: `commission-${auction.id}`,
      date: auction.auction_date || auction.created_at,
      title: auction.notes || auction.id,
      groupId: auction.group_id || auction.chit_group_id,
      memberId: auction.winner_member_id,
      status: "calculated",
      amount,
      commissionRate: 5,
    };
  });
}

function buildReceiptRows(source) {
  return (source.receipts || []).map((receipt) => ({
    id: receipt.id,
    date: receipt.payment_date || receipt.created_at,
    title: receipt.receipt_number || receipt.receiptNumber || "Receipt",
    groupId: receipt.group_id,
    memberId: receipt.member_id,
    paymentMode: receipt.payment_method || receipt.paymentMode || "cash",
    status: receipt.status || "generated",
    receiptStatus: receipt.status || "generated",
    amount: Number(receipt.amount || receipt.amountPaid || 0),
  }));
}

function buildCollectionRollupRows(collections = [], grain) {
  const rows = buildCollectionRows(collections);
  const rollup = rows.reduce((acc, row) => {
    const key = getRollupKey(row.date, grain);
    const current = acc.get(key) || { id: key, date: key, title: key, amount: 0, pendingAmount: 0, status: "ready" };
    current.amount += Number(row.amount || 0);
    current.pendingAmount += Number(row.pendingAmount || 0);
    acc.set(key, current);
    return acc;
  }, new Map());

  return [...rollup.values()].sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function buildStaffCollectionRows(source) {
  const rows = buildCollectionRows(source.collections);
  const grouped = rows.reduce((acc, row) => {
    const key = row.staffId || "unassigned";
    const current = acc.get(key) || {
      id: key,
      title: key,
      staffId: key,
      status: "ready",
      amount: 0,
      pendingAmount: 0,
      receiptCount: 0,
    };
    current.amount += Number(row.amount || 0);
    current.pendingAmount += Number(row.pendingAmount || 0);
    current.receiptCount += 1;
    acc.set(key, current);
    return acc;
  }, new Map());

  return [...grouped.values()];
}

function buildTopCustomerRows(source) {
  return buildMemberLedgerRows(source)
    .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
    .slice(0, 10);
}

function buildInactiveMemberRows(members = []) {
  return members
    .filter((member) => String(member.status || "").toLowerCase() !== "active")
    .map((member) => ({
      id: member.id,
      title: member.member_name || member.name || member.id,
      memberId: member.id,
      status: member.status || "inactive",
      amount: 0,
    }));
}

function buildTotals(rows) {
  return {
    records: rows.length,
    amount: sum(rows, (row) => row.amount),
    pendingAmount: sum(rows, (row) => row.pendingAmount),
    balance: sum(rows, (row) => row.balance),
  };
}

function getCardMetrics(reportId, stats) {
  const metricMap = {
    "business-summary": [{ label: "Groups", value: stats.activeGroups }, { label: "Members", value: stats.members }],
    "collection-report": [{ label: "Total", value: stats.collectionTotal, format: "currency" }],
    "pending-collection-report": [{ label: "Pending", value: stats.pendingTotal, format: "currency" }],
    "receipt-register": [{ label: "Receipts", value: stats.receipts }],
    "auction-report": [{ label: "Auctions", value: stats.auctions }],
    "profit-loss": [{ label: "Profit", value: stats.profit, format: "currency" }],
  };

  return metricMap[reportId] || [{ label: "Ready", value: stats.isReady ? "Yes" : "Setup" }];
}

function getColumnsForReport(reportId) {
  if (reportId === "business-summary" || reportId.includes("profit")) return ["title", "status", "amount"];
  if (reportId.includes("collection")) return ["date", "title", "staffId", "paymentMode", "status", "amount", "pendingAmount"];
  if (reportId.includes("member") || reportId.includes("passbook")) return ["date", "title", "memberNumber", "status", "amount", "pendingAmount", "balance"];
  if (reportId.includes("group")) return ["title", "groupStatus", "memberCount", "amount", "collectionAmount", "pendingAmount"];
  if (reportId.includes("receipt")) return ["date", "title", "paymentMode", "receiptStatus", "amount"];
  if (reportId.includes("auction") || reportId.includes("lucky")) return ["date", "title", "status", "amount", "dividendAmount"];
  if (reportId.includes("income") || reportId.includes("expense") || reportId.includes("commission")) return ["date", "title", "paymentMode", "status", "amount"];
  if (reportId.includes("book")) return ["date", "title", "paymentMode", "amount", "balance"];
  return ["title", "status", "amount", "pendingAmount"];
}

function createDefinition(id, title, description, category) {
  return {
    id,
    title,
    description,
    category,
    supportedModules: Object.values(REPORT_MODULES),
    exportFormats: ["PDF", "Excel", "CSV", "Print"],
  };
}

function createMetricRow(id, title, amount) {
  return {
    id,
    title,
    status: "ready",
    amount: Number(amount || 0),
  };
}

function getRollupKey(value, grain) {
  const date = String(value || new Date().toISOString()).slice(0, 10);
  if (grain === "year") return date.slice(0, 4);
  if (grain === "month") return date.slice(0, 7);
  if (grain === "week") return getWeekKey(date);
  return date;
}

function getWeekKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || "");
  const firstDay = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const dayNumber = Math.floor((date - firstDay) / 86400000) + 1;
  const weekNumber = Math.ceil(dayNumber / 7);
  return `${date.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

function isIncomeEntry(entry) {
  return ["income", "credit", "receipt"].includes(String(entry.type || "").toLowerCase())
    || Number(entry.cash_in || entry.bank_in || 0) > 0;
}

function isExpenseEntry(entry) {
  return ["expense", "debit", "payment"].includes(String(entry.type || "").toLowerCase())
    || Number(entry.cash_out || entry.bank_out || 0) > 0;
}

function sum(rows, getter) {
  return rows.reduce((total, row) => total + Number(getter(row) || 0), 0);
}
