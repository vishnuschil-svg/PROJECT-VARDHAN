import { buildFinanceAccountsEngine, formatFinanceCurrency } from "./chitFinanceAccounts";
import { buildMemberLedger, formatLedgerCurrency } from "./chitMemberLedger";

export const REPORT_EXPORT_FORMATS = {
  PDF: "pdf",
  EXCEL: "excel",
  PRINT: "print",
};

export const REPORT_DEFINITIONS = [
  { id: "daily_report", title: "Daily Report", category: "Operations" },
  { id: "monthly_report", title: "Monthly Report", category: "Operations" },
  { id: "yearly_report", title: "Yearly Report", category: "Operations" },
  { id: "member_ledger_report", title: "Member Ledger Report", category: "Ledger" },
  { id: "chit_ledger", title: "Chit Ledger", category: "Ledger" },
  { id: "collection_report", title: "Collection Report", category: "Collections" },
  { id: "pending_report", title: "Pending Report", category: "Collections" },
  { id: "auction_report", title: "Auction Report", category: "Auctions" },
  { id: "dividend_report", title: "Dividend Report", category: "Auctions" },
  { id: "cash_report", title: "Cash Report", category: "Finance" },
  { id: "bank_report", title: "Bank Report", category: "Finance" },
  { id: "expense_report", title: "Expense Report", category: "Finance" },
  { id: "income_report", title: "Income Report", category: "Finance" },
  { id: "outstanding_report", title: "Outstanding Report", category: "Finance" },
];

export function buildReportsEngine({ groups = [], members = [], collections = [], activeTenantContext }) {
  const finance = buildFinanceAccountsEngine(groups, collections);
  const memberLedgers = members.map((member) => {
    const group = groups.find((item) => item.id === member.chit_group_id);
    return {
      member,
      group,
      ledger: buildMemberLedger({ member, group, collections }),
    };
  });
  const collectionRows = collections.length
    ? buildSharedCollectionRows({ collections, members, groups })
    : buildCollectionRows(memberLedgers);
  const pendingRows = collectionRows.filter((row) => row.pending_amount > 0);
  const auctionRows = buildAuctionRows(groups, memberLedgers);
  const dividendRows = buildDividendRows(memberLedgers);

  const datasets = {
    daily_report: buildDailyReport({ finance, groups, collectionRows, pendingRows, activeTenantContext }),
    monthly_report: buildMonthlyReport({ groups, finance, collectionRows }),
    yearly_report: buildYearlyReport({ groups, finance, collectionRows }),
    member_ledger_report: buildMemberLedgerReport(memberLedgers),
    chit_ledger: buildChitLedger(groups),
    collection_report: collectionRows,
    pending_report: pendingRows,
    auction_report: auctionRows,
    dividend_report: dividendRows,
    cash_report: finance.cashBook.entries,
    bank_report: finance.bankBook.accounts,
    expense_report: finance.expenses,
    income_report: finance.income,
    outstanding_report: finance.reports.outstanding,
  };

  return REPORT_DEFINITIONS.map((definition) => {
    const rows = datasets[definition.id] || [];
    return {
      ...definition,
      rows,
      total_amount: getReportTotal(definition.id, rows),
      generated_at: new Date().toISOString(),
      tenant_id: activeTenantContext?.tenant_id || "all-tenants",
      workspace_label: activeTenantContext?.workspace_label || "Platform Owner",
    };
  });
}

export function createReportExportText(report) {
  const headers = getReportHeaders(report.rows);
  const lines = [
    "VARDHAN ERP PLATFORM",
    "MITRA NIDHI CHITI PRO",
    report.title,
    `Generated: ${new Date(report.generated_at).toLocaleString("en-IN")}`,
    `Workspace: ${report.workspace_label}`,
    `Tenant: ${report.tenant_id}`,
    "",
    headers.join(" | "),
    ...report.rows.map((row) => headers.map((header) => formatReportCell(row[header])).join(" | ")),
  ];

  return lines.join("\n");
}

export function createReportCsv(report) {
  const headers = getReportHeaders(report.rows);
  const rows = [
    headers.join(","),
    ...report.rows.map((row) =>
      headers.map((header) => `"${String(formatReportCell(row[header])).replaceAll('"', '""')}"`).join(",")
    ),
  ];

  return rows.join("\n");
}

export function createReportPrintHtml(report) {
  const headers = getReportHeaders(report.rows);
  const bodyRows = report.rows
    .map(
      (row) =>
        `<tr>${headers.map((header) => `<td>${escapeHtml(formatReportCell(row[header]))}</td>`).join("")}</tr>`
    )
    .join("");

  return `
    <html>
      <head>
        <title>${escapeHtml(report.title)}</title>
        <style>
          body { margin: 0; padding: 32px; font-family: Segoe UI, Arial, sans-serif; color: #0f172a; background: #eef3fb; }
          .sheet { background: #fff; border: 1px solid #d4af37; border-radius: 18px; padding: 28px; }
          h1 { margin: 0; color: #07111f; }
          p { color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          th { background: #07111f; color: #fff; text-align: left; padding: 10px; }
          td { border-bottom: 1px solid #e2e8f0; padding: 10px; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <h1>${escapeHtml(report.title)}</h1>
          <p>Generated ${new Date(report.generated_at).toLocaleString("en-IN")} / ${escapeHtml(report.workspace_label)}</p>
          <table>
            <thead><tr>${headers.map((header) => `<th>${escapeHtml(toTitle(header))}</th>`).join("")}</tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </div>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `;
}

export function getReportHeaders(rows = []) {
  if (!rows.length) return ["status"];
  return Object.keys(rows[0]).filter((key) => key !== "id");
}

export function toTitle(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function buildCollectionRows(memberLedgers) {
  return memberLedgers.flatMap(({ member, group, ledger }) =>
    ledger.transactions
      .filter((transaction) => transaction.collection > 0 || transaction.balance > 0)
      .map((transaction) => ({
        id: `${member.id}-${transaction.id}`,
        receipt_no: transaction.receipt_no,
        date: transaction.date,
        member_number: member.member_number,
        member_name: member.member_name,
        chit_group: group?.chit_name || "-",
        month: transaction.month,
        collection_amount: transaction.collection,
        fine: transaction.fine,
        dividend: transaction.dividend,
        pending_amount: transaction.balance,
      }))
  );
}

function buildSharedCollectionRows({ collections, members, groups }) {
  return collections.map((collection) => {
    const member = members.find((item) => item.id === collection.member_id);
    const group = groups.find((item) => item.id === (collection.chit_group_id || collection.group_id));

    return {
      id: collection.id,
      receipt_no: collection.receipt_number || "-",
      date: (collection.payment_date || collection.created_at || new Date().toISOString()).slice(0, 10),
      member_number: member?.member_number || "-",
      member_name: member?.member_name || "-",
      chit_group: group?.chit_name || "-",
      month: formatCollectionMonth(collection.collection_month),
      collection_amount: Number(collection.paid_amount || 0),
      fine: Number(collection.fine_amount || 0),
      dividend: Number(collection.dividend_adjustment || 0),
      pending_amount: Number(collection.pending_amount || 0),
    };
  });
}

function buildDailyReport({ finance, groups, collectionRows, pendingRows, activeTenantContext }) {
  return [
    {
      id: "daily-001",
      date: new Date().toISOString().slice(0, 10),
      workspace: activeTenantContext?.workspace_label || "Platform Owner",
      active_chits: groups.length,
      collections: finance.dailyClosing.collections,
      cash: finance.dailyClosing.cash,
      bank: finance.dailyClosing.bank,
      expenses: finance.dailyClosing.expenses,
      receipts: collectionRows.length,
      pending_entries: pendingRows.length,
      difference: finance.dailyClosing.difference,
    },
  ];
}

function buildMonthlyReport({ groups, finance, collectionRows }) {
  return groups.map((group) => ({
    id: `monthly-${group.id}`,
    month: new Date().toISOString().slice(0, 7),
    chit_group: group.chit_name,
    monthly_target: Number(group.monthly_amount || 0) * Number(group.total_members || 0),
    collections: collectionRows
      .filter((row) => row.chit_group === group.chit_name)
      .reduce((sum, row) => sum + row.collection_amount, 0),
    pending: Number(group.pending_collections || 0),
    income: finance.dashboard.todays_income,
    expenses: finance.dashboard.todays_expenses,
  }));
}

function buildYearlyReport({ groups, finance, collectionRows }) {
  return [
    {
      id: "yearly-001",
      financial_year: getCurrentFinancialYear(),
      total_chits: groups.length,
      total_members: groups.reduce((sum, group) => sum + Number(group.total_members || 0), 0),
      total_collections: collectionRows.reduce((sum, row) => sum + row.collection_amount, 0),
      total_pending: groups.reduce((sum, group) => sum + Number(group.pending_collections || 0), 0),
      net_balance: finance.dashboard.net_balance,
      monthly_profit: finance.dashboard.monthly_profit,
    },
  ];
}

function buildMemberLedgerReport(memberLedgers) {
  return memberLedgers.map(({ member, group, ledger }) => ({
    id: `ledger-${member.id}`,
    member_number: member.member_number,
    member_name: member.member_name,
    mobile: member.mobile_number,
    chit_group: group?.chit_name || "-",
    total_paid: ledger.total_installments_paid,
    pending: ledger.pending_installments,
    dividend: ledger.dividend_received,
    lift_amount: ledger.lift_amount,
    outstanding: ledger.outstanding_balance,
    lift_status: ledger.lift_status,
  }));
}

function buildChitLedger(groups) {
  return groups.map((group) => ({
    id: `chit-ledger-${group.id}`,
    chit_code: group.chit_code,
    chit_group: group.chit_name,
    status: group.status,
    chit_value: Number(group.chit_value || 0),
    monthly_amount: Number(group.monthly_amount || 0),
    total_members: Number(group.total_members || 0),
    monthly_target: Number(group.monthly_amount || 0) * Number(group.total_members || 0),
    pending_collections: Number(group.pending_collections || 0),
    outstanding_amount: Number(group.outstanding_amount || 0),
  }));
}

function buildAuctionRows(groups, memberLedgers) {
  return groups.map((group, index) => {
    const winner = memberLedgers.find((item) => item.group?.id === group.id && item.ledger.lift_amount > 0);
    return {
      id: `auction-report-${group.id}`,
      auction_date: group.next_auction_date || "-",
      chit_group: group.chit_name,
      auction_month: index + 1,
      winner: winner?.member.member_name || "Scheduled",
      bid_amount: Math.round(Number(group.chit_value || 0) * 0.82),
      lift_amount: winner?.ledger.lift_amount || 0,
      status: winner ? "Completed" : "Upcoming",
    };
  });
}

function buildDividendRows(memberLedgers) {
  return memberLedgers
    .filter((item) => item.ledger.dividend_received > 0)
    .map(({ member, group, ledger }) => ({
      id: `dividend-${member.id}`,
      member_number: member.member_number,
      member_name: member.member_name,
      chit_group: group?.chit_name || "-",
      dividend_received: ledger.dividend_received,
      adjustment: ledger.transactions.reduce((sum, item) => sum + item.adjustment, 0),
      outstanding: ledger.outstanding_balance,
    }));
}

function getReportTotal(reportId, rows) {
  const amountFields = {
    collection_report: "collection_amount",
    pending_report: "pending_amount",
    dividend_report: "dividend_received",
    cash_report: "balance",
    bank_report: "balance",
    expense_report: "amount",
    income_report: "amount",
    outstanding_report: "amount",
  };
  const field = amountFields[reportId];
  if (!field) return rows.length;
  return rows.reduce((sum, row) => sum + Number(row[field] || 0), 0);
}

function formatReportCell(value) {
  if (typeof value === "number") return formatFinanceCurrency(value);
  return value ?? "";
}

function getCurrentFinancialYear() {
  const date = new Date();
  const year = date.getFullYear();
  return date.getMonth() >= 3 ? `${year}-${String(year + 1).slice(-2)}` : `${year - 1}-${String(year).slice(-2)}`;
}

function formatCollectionMonth(monthValue) {
  if (!monthValue) {
    return "-";
  }

  const date = new Date(`${monthValue}-01`);
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
