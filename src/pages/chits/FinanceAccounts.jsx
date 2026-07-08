import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileBarChart,
  Landmark,
  ReceiptText,
  Scale,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useMemo } from "react";
import ChitLayout from "../../components/chit/ChitLayout";
import Badge from "../../components/common/Badge";
import Table from "../../components/common/Table";
import {
  PHASE_ONE_CHIT_GROUPS,
} from "../../config/chitPhaseOneData";
import {
  buildFinanceAccountsEngine,
  EXPENSE_CATEGORIES,
  formatFinanceCurrency,
  getFinanceVisibleGroups,
  INCOME_CATEGORIES,
  VOUCHER_TYPES,
} from "../../config/chitFinanceAccounts";
import { CHIT_PRODUCT_NAME, isPlatformOwner } from "../../config/erpModules";
import { useAuth } from "../../hooks/useAuth";
import { useTenantCollections } from "../../services/chitCollectionsStore";
import "./FinanceAccounts.css";

function FinanceAccounts() {
  const { activeTenantContext, profile, role } = useAuth();
  const platformOwner = isPlatformOwner(profile, role);
  const collections = useTenantCollections(activeTenantContext);
  const visibleGroups = useMemo(
    () =>
      getFinanceVisibleGroups({
        groups: PHASE_ONE_CHIT_GROUPS,
        activeTenantContext,
        platformOwner,
      }),
    [activeTenantContext, platformOwner]
  );
  const finance = useMemo(
    () => buildFinanceAccountsEngine(visibleGroups, collections),
    [collections, visibleGroups]
  );

  const cashColumns = [
    { key: "date", label: "Date", width: "120px", render: formatDate },
    { key: "particulars", label: "Particulars", width: "220px" },
    { key: "cash_in", label: "Cash In", width: "130px", render: formatFinanceCurrency },
    { key: "cash_out", label: "Cash Out", width: "130px", render: formatFinanceCurrency },
    { key: "balance", label: "Balance", width: "130px", render: formatFinanceCurrency },
  ];

  const bankColumns = [
    { key: "bank_name", label: "Bank Account", width: "230px" },
    { key: "account_number", label: "Account No", width: "140px" },
    { key: "deposits", label: "Deposits", width: "130px", render: formatFinanceCurrency },
    { key: "withdrawals", label: "Withdrawals", width: "130px", render: formatFinanceCurrency },
    { key: "transfers", label: "Transfers", width: "130px", render: formatFinanceCurrency },
    { key: "balance", label: "Balance", width: "140px", render: formatFinanceCurrency },
    {
      key: "reconciled",
      label: "Reconciliation",
      width: "130px",
      render: (value) => <Badge label={value ? "Done" : "Pending"} variant={value ? "success" : "warning"} size="small" />,
    },
  ];

  const expenseColumns = [
    { key: "date", label: "Date", width: "120px", render: formatDate },
    { key: "category", label: "Category", width: "150px" },
    { key: "description", label: "Description", width: "220px" },
    { key: "amount", label: "Amount", width: "130px", render: formatFinanceCurrency },
    { key: "payment_mode", label: "Mode", width: "100px" },
    { key: "status", label: "Status", width: "140px", render: (value) => <Badge label={value} variant={value === "Posted" ? "success" : "warning"} size="small" /> },
  ];

  const incomeColumns = [
    { key: "date", label: "Date", width: "120px", render: formatDate },
    { key: "receipt_no", label: "Receipt", width: "110px" },
    { key: "category", label: "Category", width: "160px" },
    { key: "description", label: "Description", width: "220px" },
    { key: "amount", label: "Amount", width: "130px", render: formatFinanceCurrency },
  ];

  const voucherColumns = [
    { key: "type", label: "Voucher Type", width: "160px" },
    { key: "date", label: "Date", width: "120px", render: formatDate },
    { key: "narration", label: "Narration", width: "240px" },
    { key: "debit", label: "Debit", width: "140px" },
    { key: "credit", label: "Credit", width: "140px" },
    { key: "amount", label: "Amount", width: "130px", render: formatFinanceCurrency },
    { key: "status", label: "Status", width: "120px", render: (value) => <Badge label={value} variant="primary" size="small" /> },
  ];

  return (
    <ChitLayout
      title="Finance & Accounts"
      subtitle={`${CHIT_PRODUCT_NAME} integrated cash, bank, voucher and reporting engine`}
    >
      <div className="finance-page">
        <section className="finance-hero">
          <div>
            <span>Phase 8 accounting control room</span>
            <h2>Finance & Accounts Engine</h2>
            <p>
              Cash book, bank book, expenses, income, vouchers, daily closing and reports
              stay aligned with tenant-visible chit operations.
            </p>
          </div>
          <div className="finance-security-chip">
            <ShieldCheck size={18} />
            <strong>{activeTenantContext?.workspace_label || "Platform Owner"}</strong>
            <span>{activeTenantContext?.tenant_id || "All tenant data"}</span>
          </div>
        </section>

        <section className="finance-dashboard-grid">
          <FinanceKpi icon={<Wallet size={20} />} label="Cash in Hand" value={finance.dashboard.cash_in_hand} tone="good" />
          <FinanceKpi icon={<Landmark size={20} />} label="Bank Balance" value={finance.dashboard.bank_balance} tone="primary" />
          <FinanceKpi icon={<ArrowDownToLine size={20} />} label="Today's Income" value={finance.dashboard.todays_income} tone="good" />
          <FinanceKpi icon={<ArrowUpFromLine size={20} />} label="Today's Expenses" value={finance.dashboard.todays_expenses} tone="warning" />
          <FinanceKpi icon={<Scale size={20} />} label="Net Balance" value={finance.dashboard.net_balance} tone="primary" />
          <FinanceKpi icon={<FileBarChart size={20} />} label="Monthly Profit" value={finance.dashboard.monthly_profit} tone={finance.dashboard.monthly_profit >= 0 ? "good" : "risk"} />
        </section>

        <section className="finance-book-grid">
          <FinancePanel title="Cash Book" subtitle="Opening balance, cash in/out and daily closing.">
            <div className="finance-mini-grid">
              <MiniStat label="Opening Balance" value={finance.cashBook.opening_balance} />
              <MiniStat label="Cash In" value={finance.cashBook.cash_in} tone="good" />
              <MiniStat label="Cash Out" value={finance.cashBook.cash_out} tone="warning" />
              <MiniStat label="Closing Balance" value={finance.cashBook.closing_balance} tone="primary" />
            </div>
            <Table columns={cashColumns} data={finance.cashBook.entries} />
          </FinancePanel>

          <FinancePanel title="Bank Book" subtitle="Multiple accounts, deposits, withdrawals, transfers and reconciliation.">
            <div className="finance-mini-grid">
              <MiniStat label="Deposits" value={finance.bankBook.deposits} tone="good" />
              <MiniStat label="Withdrawals" value={finance.bankBook.withdrawals} tone="warning" />
              <MiniStat label="Transfers" value={finance.bankBook.transfers} tone="primary" />
              <MiniStat label="Reconciliation" text={finance.bankBook.reconciliation ? "Complete" : "Pending"} tone={finance.bankBook.reconciliation ? "good" : "warning"} />
            </div>
            <Table columns={bankColumns} data={finance.bankBook.accounts} />
          </FinancePanel>
        </section>

        <section className="finance-taxonomy-grid">
          <TaxonomyCard icon={<ArrowUpFromLine size={20} />} title="Expense Categories" items={EXPENSE_CATEGORIES} tone="warning" />
          <TaxonomyCard icon={<ArrowDownToLine size={20} />} title="Income Categories" items={INCOME_CATEGORIES} tone="good" />
          <TaxonomyCard icon={<ReceiptText size={20} />} title="Voucher System" items={VOUCHER_TYPES} tone="primary" />
        </section>

        <section className="finance-book-grid">
          <FinancePanel title="Expense Management" subtitle="Office rent, salary, utilities and operating expenses.">
            <Table columns={expenseColumns} data={finance.expenses} />
          </FinancePanel>

          <FinancePanel title="Income Management" subtitle="Registration fees, penalties, interest and other income.">
            <Table columns={incomeColumns} data={finance.income} />
          </FinancePanel>
        </section>

        <FinancePanel title="Voucher System" subtitle="Receipt, payment, journal and contra vouchers.">
          <Table columns={voucherColumns} data={finance.vouchers} />
        </FinancePanel>

        <section className="finance-closing-report-grid">
          <div className="daily-closing-card">
            <div className="finance-section-header">
              <div>
                <h3>Daily Closing</h3>
                <p>Verify collections, cash, bank, expenses, receipts and difference.</p>
              </div>
              <Badge label={finance.dailyClosing.difference === 0 ? "Balanced" : "Difference"} variant={finance.dailyClosing.difference === 0 ? "success" : "warning"} size="small" />
            </div>
            <div className="daily-closing-grid">
              <ClosingItem label="Collections" value={finance.dailyClosing.collections} />
              <ClosingItem label="Cash" value={finance.dailyClosing.cash} />
              <ClosingItem label="Bank" value={finance.dailyClosing.bank} />
              <ClosingItem label="Expenses" value={finance.dailyClosing.expenses} />
              <ClosingItem label="Receipts" text={finance.dailyClosing.receipts} />
              <ClosingItem label="Difference" value={finance.dailyClosing.difference} tone={finance.dailyClosing.difference === 0 ? "good" : "warning"} />
            </div>
          </div>

          <div className="finance-reports-card">
            <div className="finance-section-header">
              <div>
                <h3>Reports</h3>
                <p>Cash book, bank book, day book, income & expense, profit & loss and outstanding.</p>
              </div>
            </div>
            <div className="finance-report-list">
              <ReportRow icon={<BookOpen size={16} />} label="Cash Book" count={finance.reports.cash_book.length} />
              <ReportRow icon={<Banknote size={16} />} label="Bank Book" count={finance.reports.bank_book.length} />
              <ReportRow icon={<ClipboardCheck size={16} />} label="Day Book" count={finance.reports.day_book.length} />
              <ReportRow icon={<ReceiptText size={16} />} label="Income & Expense" count={finance.reports.income_expense.length} />
              <ReportRow icon={<FileBarChart size={16} />} label="Profit & Loss" count={finance.reports.profit_loss.length} />
              <ReportRow icon={<Scale size={16} />} label="Outstanding" count={finance.reports.outstanding.length} />
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

function MiniStat({ label, value, text, tone = "neutral" }) {
  return (
    <div className={`finance-mini-stat tone-${tone}`}>
      <span>{label}</span>
      <strong>{text || formatFinanceCurrency(value)}</strong>
    </div>
  );
}

function TaxonomyCard({ icon, title, items, tone }) {
  return (
    <article className={`finance-taxonomy-card tone-${tone}`}>
      <div>{icon}</div>
      <h3>{title}</h3>
      <div className="finance-chip-list">
        {items.map((item) => <span key={item}>{item}</span>)}
      </div>
    </article>
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

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-IN");
}

export default FinanceAccounts;
