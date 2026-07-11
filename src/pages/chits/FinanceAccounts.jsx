import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  BookOpen,
  Download,
  FileBarChart,
  Landmark,
  ReceiptText,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import ChitLayout from "../../components/chit/ChitLayout";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Table from "../../components/common/Table";
import { CHIT_PRODUCT_NAME } from "../../config/erpModules";
import { useAuth } from "../../hooks/useAuth";
import { formatFinanceCurrency, getFinancePageModel } from "../../services/financeService";
import "./FinanceAccounts.css";

function FinanceAccounts() {
  const { activeTenantContext } = useAuth();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const finance = useMemo(
    () => getFinancePageModel(activeTenantContext, { query, filter }),
    [activeTenantContext, query, filter]
  );

  const exportFinance = () => {
    try {
      const csv = buildCsv(finance.transactions);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `finance-export-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Unable to export finance rows.");
    }
  };

  const transactionColumns = [
    { key: "date", label: "Date", width: "120px", render: formatDate },
    { key: "type", label: "Type", width: "130px" },
    { key: "category", label: "Category", width: "160px" },
    { key: "description", label: "Description", width: "240px" },
    { key: "amount", label: "Amount", width: "130px", render: formatFinanceCurrency },
    { key: "payment_mode", label: "Mode", width: "110px" },
    { key: "reference", label: "Reference", width: "150px" },
    { key: "status", label: "Status", width: "120px", render: renderStatus },
  ];
  const cashColumns = [
    { key: "date", label: "Date", width: "120px", render: formatDate },
    { key: "particulars", label: "Particulars", width: "230px" },
    { key: "cash_in", label: "Cash In", width: "130px", render: formatFinanceCurrency },
    { key: "cash_out", label: "Cash Out", width: "130px", render: formatFinanceCurrency },
    { key: "balance", label: "Balance", width: "130px", render: formatFinanceCurrency },
  ];
  const bankColumns = [
    { key: "date", label: "Date", width: "120px", render: formatDate },
    { key: "bank_name", label: "Bank Account", width: "190px" },
    { key: "account_number", label: "Account", width: "120px" },
    { key: "deposits", label: "Deposits", width: "130px", render: formatFinanceCurrency },
    { key: "withdrawals", label: "Withdrawals", width: "130px", render: formatFinanceCurrency },
    { key: "balance", label: "Balance", width: "130px", render: formatFinanceCurrency },
  ];
  const incomeColumns = [
    { key: "date", label: "Date", width: "120px", render: formatDate },
    { key: "receipt_no", label: "Receipt", width: "150px" },
    { key: "category", label: "Category", width: "160px" },
    { key: "description", label: "Description", width: "240px" },
    { key: "amount", label: "Amount", width: "130px", render: formatFinanceCurrency },
  ];
  const expenseColumns = [
    { key: "date", label: "Date", width: "120px", render: formatDate },
    { key: "category", label: "Category", width: "160px" },
    { key: "description", label: "Description", width: "240px" },
    { key: "amount", label: "Amount", width: "130px", render: formatFinanceCurrency },
    { key: "payment_mode", label: "Mode", width: "110px" },
    { key: "status", label: "Status", width: "120px", render: renderStatus },
  ];
  const commissionColumns = [
    { key: "date", label: "Date", width: "120px", render: formatDate },
    { key: "sourceId", label: "Auction", width: "180px" },
    { key: "rate", label: "Rate", width: "90px", render: (value) => `${value}%` },
    { key: "amount", label: "Commission", width: "150px", render: formatFinanceCurrency },
    { key: "status", label: "Status", width: "120px", render: renderStatus },
  ];
  const ledgerColumns = [
    { key: "date", label: "Date", width: "120px", render: formatDate },
    { key: "account", label: "Ledger", width: "220px" },
    { key: "debit", label: "Debit", width: "130px", render: formatFinanceCurrency },
    { key: "credit", label: "Credit", width: "130px", render: formatFinanceCurrency },
    { key: "reference", label: "Reference", width: "160px" },
  ];

  return (
    <ChitLayout
      title="Finance & Accounts"
      subtitle={`${CHIT_PRODUCT_NAME} production accounting engine`}
      actions={
        <Button variant="primary" icon={<Download size={16} />} onClick={exportFinance}>
          Export Ready
        </Button>
      }
    >
      <div className="finance-page">
        <section className="finance-hero">
          <div>
            <span>Production accounting control room</span>
            <h2>Finance Module</h2>
            <p>Collections automatically update cash, bank, income, profit, ledger, reports, dashboard, activity and notification data through repository-backed services.</p>
          </div>
          <div className="finance-security-chip">
            <ShieldCheck size={18} />
            <strong>{activeTenantContext?.workspace_label || "Tenant Workspace"}</strong>
            <span>{activeTenantContext?.tenant_id || "No tenant selected"}</span>
          </div>
        </section>

        {error && <div className="finance-error-state">{error}</div>}

        <section className="finance-dashboard-grid">
          {finance.summaryCards.map((card) => (
            <FinanceKpi
              key={card.key}
              icon={getSummaryIcon(card.key)}
              label={card.label}
              value={card.value}
              tone={card.tone}
            />
          ))}
        </section>

        <section className="finance-control-bar">
          <label>
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search transactions, ledger, receipt, mode"
            />
          </label>
          <div>
            {finance.filters.map((item) => (
              <button
                key={item.value}
                type="button"
                className={filter === item.value ? "active" : ""}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <FinancePanel title="Financial Summary" subtitle="Filtered transaction register with export-ready rows.">
          {finance.transactions.length ? (
            <Table columns={transactionColumns} data={finance.transactions} />
          ) : (
            <EmptyFinanceState title={finance.emptyState.title} message={finance.emptyState.message} />
          )}
        </FinancePanel>

        <section className="finance-book-grid">
          <FinancePanel title="Cash Book" subtitle="Cash receipts, cash payments and cash in hand.">
            <MiniGrid items={[
              ["Cash In", finance.cashBook.cashIn, "good"],
              ["Cash Out", finance.cashBook.cashOut, "warning"],
              ["Cash in Hand", finance.cashBook.cashInHand, "primary"],
            ]} />
            <Table columns={cashColumns} data={finance.cashRows} />
          </FinancePanel>

          <FinancePanel title="Bank Book" subtitle="Bank deposits, withdrawals and balance.">
            <MiniGrid items={[
              ["Bank In", finance.bankBook.bankIn, "good"],
              ["Bank Out", finance.bankBook.bankOut, "warning"],
              ["Bank Balance", finance.bankBook.bankBalance, "primary"],
            ]} />
            <Table columns={bankColumns} data={finance.bankRows} />
          </FinancePanel>
        </section>

        <section className="finance-book-grid">
          <FinancePanel title="Income Register" subtitle="Collection income and other credited entries.">
            <Table columns={incomeColumns} data={finance.incomeRows} />
          </FinancePanel>
          <FinancePanel title="Expense Register" subtitle="Operating expenses and debited entries.">
            <Table columns={expenseColumns} data={finance.expenseRows} />
          </FinancePanel>
        </section>

        <section className="finance-book-grid">
          <FinancePanel title="Commission Register" subtitle="Auction commission calculations from domain engine.">
            <Table columns={commissionColumns} data={finance.commissionRows} />
          </FinancePanel>
          <FinancePanel title="Profit Register" subtitle="Income, expense, commission, pending collection and net profit.">
            <div className="finance-profit-register">
              <MiniStat label="Income" value={finance.profit.income} tone="good" />
              <MiniStat label="Expense" value={finance.profit.expense} tone="warning" />
              <MiniStat label="Commission" value={finance.profit.commission} tone="primary" />
              <MiniStat label="Pending" value={finance.profit.pendingCollection} tone="warning" />
              <MiniStat label="Net Profit" value={finance.profit.netProfit} tone={finance.profit.netProfit >= 0 ? "good" : "risk"} />
            </div>
          </FinancePanel>
        </section>

        <FinancePanel title="General Ledger" subtitle="Debit, credit, reference and trial-balance readiness.">
          <Table columns={ledgerColumns} data={finance.ledgerRows} />
        </FinancePanel>

        <section className="finance-closing-report-grid">
          <div className="daily-closing-card">
            <div className="finance-section-header">
              <div>
                <h3>Day Closing</h3>
                <p>Daily income, expense, closing balance and difference.</p>
              </div>
              <Badge label={finance.closing.day.status} variant={finance.closing.day.status === "Balanced" ? "success" : "warning"} size="small" />
            </div>
            <div className="daily-closing-grid">
              <ClosingItem label="Today's Income" value={finance.closing.day.todaysIncome} />
              <ClosingItem label="Today's Expense" value={finance.closing.day.todaysExpense} />
              <ClosingItem label="Closing Balance" value={finance.closing.day.closingBalance} />
              <ClosingItem label="Difference" value={finance.closing.day.difference} tone={finance.closing.day.difference === 0 ? "good" : "warning"} />
            </div>
          </div>

          <div className="finance-reports-card">
            <div className="finance-section-header">
              <div>
                <h3>Month Closing</h3>
                <p>Month profit status and report update readiness.</p>
              </div>
              <Badge label={finance.closing.month.status} variant={finance.closing.month.status === "Profitable" ? "success" : "warning"} size="small" />
            </div>
            <div className="finance-report-list">
              <ReportRow icon={<BookOpen size={16} />} label="Cash Book" count={finance.cashRows.length} />
              <ReportRow icon={<Banknote size={16} />} label="Bank Book" count={finance.bankRows.length} />
              <ReportRow icon={<ReceiptText size={16} />} label="Income Register" count={finance.incomeRows.length} />
              <ReportRow icon={<FileBarChart size={16} />} label="Ledger" count={finance.ledgerRows.length} />
            </div>
          </div>
        </section>
      </div>
    </ChitLayout>
  );
}

function FinanceKpi({ icon, label, value, tone = "primary" }) {
  return (
    <article className={`finance-kpi tone-${tone}`}>
      <div className="finance-kpi-icon">{icon}</div>
      <span>{label}</span>
      <strong>{formatFinanceCurrency(value)}</strong>
    </article>
  );
}

function FinancePanel({ title, subtitle, children }) {
  return (
    <section className="finance-panel">
      <div className="finance-section-header">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function MiniGrid({ items }) {
  return (
    <div className="finance-mini-grid">
      {items.map(([label, value, tone]) => (
        <MiniStat key={label} label={label} value={value} tone={tone} />
      ))}
    </div>
  );
}

function MiniStat({ label, value, text, tone = "neutral" }) {
  return (
    <div className={`finance-mini-stat tone-${tone}`}>
      <span>{label}</span>
      <strong>{text || formatFinanceCurrency(value)}</strong>
    </div>
  );
}

function ClosingItem({ label, value, text, tone = "neutral" }) {
  return (
    <div className={`closing-item tone-${tone}`}>
      <span>{label}</span>
      <strong>{text ?? formatFinanceCurrency(value)}</strong>
    </div>
  );
}

function ReportRow({ icon, label, count }) {
  return (
    <div className="finance-report-row">
      <span>{icon}</span>
      <strong>{label}</strong>
      <Badge label={`${count} rows`} variant="primary" size="small" />
    </div>
  );
}

function EmptyFinanceState({ title, message }) {
  return (
    <div className="finance-empty-state">
      <FileBarChart size={34} />
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

function renderStatus(value) {
  return <Badge label={value || "Posted"} variant={value === "Posted" || value === "Calculated" ? "success" : "warning"} size="small" />;
}

function getSummaryIcon(key) {
  const icons = {
    cashInHand: <Wallet size={20} />,
    bankBalance: <Landmark size={20} />,
    todaysIncome: <ArrowDownToLine size={20} />,
    todaysExpense: <ArrowUpFromLine size={20} />,
    todaysProfit: <FileBarChart size={20} />,
    monthProfit: <FileBarChart size={20} />,
  };
  return icons[key] || <FileBarChart size={20} />;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN");
}

function buildCsv(rows) {
  const headers = ["date", "type", "category", "description", "amount", "payment_mode", "reference", "status"];
  const body = rows.map((row) =>
    headers.map((header) => `"${String(row[header] ?? "").replaceAll("\"", "\"\"")}"`).join(",")
  );
  return [headers.join(","), ...body].join("\n");
}

export default FinanceAccounts;
