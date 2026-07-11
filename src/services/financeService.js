import { FinanceRepository } from "../repositories/FinanceRepository.js";
import { AccountingEngine } from "../domain/finance/services/AccountingEngine.js";
import { BankBookEngine } from "../domain/finance/services/BankBookEngine.js";
import { CashBookEngine } from "../domain/finance/services/CashBookEngine.js";
import { CommissionEngine } from "../domain/finance/services/CommissionEngine.js";
import { DayClosingEngine } from "../domain/finance/services/DayClosingEngine.js";
import { LedgerEngine } from "../domain/finance/services/LedgerEngine.js";
import { ProfitEngine } from "../domain/finance/services/ProfitEngine.js";

export function getFinanceDashboardSummary(activeTenantContext) {
  const model = getFinanceEngineModel(activeTenantContext);

  return {
    title: "Finance Summary",
    subtitle: "Cash, bank, income, expense and profit position",
    actionRoute: "/chits/finance",
    metrics: [
      { key: "todaysIncome", label: "Today's Income", value: model.dayClosing.todaysIncome, tone: "good" },
      { key: "todaysExpense", label: "Today's Expense", value: model.dayClosing.todaysExpense, tone: "warning" },
      { key: "cashInHand", label: "Cash in Hand", value: model.cashBook.cashInHand, tone: "good" },
      { key: "bankBalance", label: "Bank Balance", value: model.bankBook.bankBalance, tone: "neutral" },
      { key: "netProfit", label: "Net Profit", value: model.profit.netProfit, tone: model.profit.netProfit >= 0 ? "profit" : "warning" },
      { key: "pendingCollection", label: "Pending Collection", value: model.pendingCollection, tone: "warning" },
    ].map((metric) => ({
      ...metric,
      displayValue: formatFinanceCurrency(metric.value),
    })),
    closing: {
      dayStatus: model.dayClosing.status,
      monthStatus: model.monthClosing.status,
      difference: formatFinanceCurrency(model.dayClosing.difference),
    },
  };
}

export function getFinanceEngineModel(activeTenantContext) {
  const source = FinanceRepository.getFinanceSource(activeTenantContext);
  const normalized = AccountingEngine.normalizeSource(source);
  const cashBook = CashBookEngine.buildCashBook(normalized.cashTransactions);
  const bankBook = BankBookEngine.buildBankBook(normalized.bankTransactions);
  const commissions = CommissionEngine.buildCommissionRegister({ auctions: source.auctions });
  const pendingCollection = (source.collections || []).reduce(
    (sum, collection) => sum + Number(collection.pending_amount || 0),
    0
  );
  const profit = ProfitEngine.buildProfitRegister({
    income: normalized.income,
    expenses: normalized.expenses,
    commissions,
    pendingCollection,
    period: new Date().toISOString().slice(0, 7),
  });
  const dayClosing = DayClosingEngine.buildDayClosing({
    income: normalized.income,
    expenses: normalized.expenses,
    cashBook,
    bankBook,
  });
  const monthClosing = DayClosingEngine.buildMonthClosing({ profit });

  return {
    source,
    ...normalized,
    cashBook,
    bankBook,
    commissions,
    ledger: LedgerEngine.buildLedger(source),
    pendingCollection,
    profit,
    dayBook: AccountingEngine.buildDayBook(source),
    dayClosing,
    monthClosing,
    registers: {
      income: normalized.income,
      expenses: normalized.expenses,
      commissions,
      profit,
    },
  };
}

export function getFinancePageModel(activeTenantContext, { query = "", filter = "all" } = {}) {
  const model = getFinanceEngineModel(activeTenantContext);
  const financeEntries = model.source.financeEntries || [];
  const transactions = applyFinanceFilters(buildTransactionRows(financeEntries, model), { query, filter });
  const today = new Date().toISOString().slice(0, 10);
  const todayProfit = Number(model.dayClosing.todaysIncome || 0) - Number(model.dayClosing.todaysExpense || 0);

  return {
    ...model,
    exportReady: true,
    summaryCards: [
      { key: "cashInHand", label: "Cash in Hand", value: model.cashBook.cashInHand, tone: "good" },
      { key: "bankBalance", label: "Bank Balance", value: model.bankBook.bankBalance, tone: "primary" },
      { key: "todaysIncome", label: "Today's Income", value: model.dayClosing.todaysIncome, tone: "good" },
      { key: "todaysExpense", label: "Today's Expense", value: model.dayClosing.todaysExpense, tone: "warning" },
      { key: "todaysProfit", label: "Today's Profit", value: todayProfit, tone: todayProfit >= 0 ? "good" : "risk" },
      { key: "monthProfit", label: "Month Profit", value: model.profit.netProfit, tone: model.profit.netProfit >= 0 ? "good" : "risk" },
    ],
    filters: [
      { value: "all", label: "All" },
      { value: "cash", label: "Cash" },
      { value: "bank", label: "Bank" },
      { value: "income", label: "Income" },
      { value: "expense", label: "Expense" },
      { value: "today", label: "Today" },
    ],
    transactions,
    cashRows: model.cashBook.entries.map((entry) => ({
      id: entry.id,
      date: entry.date,
      particulars: entry.particulars,
      cash_in: entry.cashIn,
      cash_out: entry.cashOut,
      balance: entry.balance || model.cashBook.cashInHand,
      status: entry.status,
    })),
    bankRows: model.bankBook.entries.map((entry) => ({
      id: entry.id,
      date: entry.date,
      bank_name: entry.bankName,
      account_number: entry.accountNumber || "Operating",
      deposits: entry.bankIn,
      withdrawals: entry.bankOut,
      balance: entry.balance || model.bankBook.bankBalance,
      payment_mode: entry.paymentMode,
    })),
    incomeRows: model.income.map((entry) => ({
      id: entry.id,
      date: entry.date,
      receipt_no: entry.receiptNumber,
      category: entry.category,
      description: entry.description,
      amount: entry.amount,
      payment_mode: entry.paymentMode,
    })),
    expenseRows: model.expenses.map((entry) => ({
      id: entry.id,
      date: entry.date,
      category: entry.category,
      description: entry.description,
      amount: entry.amount,
      payment_mode: entry.paymentMode,
      status: entry.status,
    })),
    commissionRows: model.commissions,
    profitRows: [model.profit],
    ledgerRows: model.ledger.entries,
    closing: {
      day: model.dayClosing,
      month: model.monthClosing,
      today,
    },
    emptyState: {
      title: "No finance transactions found",
      message: "Collections automatically create finance entries. Adjust search or post a collection to populate this register.",
    },
  };
}

export function formatFinanceCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function buildTransactionRows(financeEntries, model) {
  return [
    ...financeEntries.map((entry) => ({
      id: entry.id,
      date: entry.date || entry.payment_date || entry.created_at,
      type: entry.type || entry.category || "Finance",
      category: entry.category || "General",
      description: entry.description || entry.particulars || "",
      amount: Number(entry.amount || entry.cash_in || entry.cash_out || entry.bank_in || entry.bank_out || 0),
      payment_mode: entry.payment_mode || entry.paymentMode || "",
      status: entry.status || "Posted",
      reference: entry.receipt_no || entry.voucher_no || "",
      cash_in: Number(entry.cash_in || 0),
      cash_out: Number(entry.cash_out || 0),
      bank_in: Number(entry.bank_in || 0),
      bank_out: Number(entry.bank_out || 0),
    })),
    ...model.commissions.map((entry) => ({
      id: entry.id,
      date: entry.date,
      type: "commission",
      category: "Commission",
      description: entry.sourceId || "Auction commission",
      amount: entry.amount,
      payment_mode: "",
      status: entry.status,
      reference: entry.sourceId,
      cash_in: 0,
      cash_out: 0,
      bank_in: 0,
      bank_out: 0,
    })),
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

function applyFinanceFilters(rows, { query, filter }) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const today = new Date().toISOString().slice(0, 10);

  return rows.filter((row) => {
    const matchesQuery = !normalizedQuery || [
      row.type,
      row.category,
      row.description,
      row.payment_mode,
      row.reference,
      row.status,
    ].some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
    const matchesFilter =
      filter === "all" ||
      (filter === "cash" && (row.cash_in || row.cash_out)) ||
      (filter === "bank" && (row.bank_in || row.bank_out)) ||
      (filter === "income" && Number(row.cash_in || row.bank_in || 0) > 0) ||
      (filter === "expense" && Number(row.cash_out || row.bank_out || 0) > 0) ||
      (filter === "today" && String(row.date || "").slice(0, 10) === today);

    return matchesQuery && matchesFilter;
  });
}
