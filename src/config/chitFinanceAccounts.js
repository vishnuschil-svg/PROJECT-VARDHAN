import { CHIT_GROUP_STATUS } from "./chitPhaseOneData";

export const EXPENSE_CATEGORIES = [
  "Office Rent",
  "Salary",
  "Electricity",
  "Internet",
  "Stationery",
  "Travel",
  "Marketing",
  "Miscellaneous",
];

export const INCOME_CATEGORIES = [
  "Registration Fee",
  "Penalties",
  "Other Income",
  "Interest",
  "Miscellaneous",
];

export const VOUCHER_TYPES = [
  "Receipt Voucher",
  "Payment Voucher",
  "Journal Voucher",
  "Contra Voucher",
];

export function getFinanceVisibleGroups({ groups = [], activeTenantContext, platformOwner = false }) {
  if (platformOwner && !activeTenantContext?.tenant_id) {
    return groups;
  }

  if (!activeTenantContext?.tenant_id || !activeTenantContext?.data_scope) {
    return [];
  }

  return groups.filter(
    (group) =>
      group.tenant_id === activeTenantContext.tenant_id &&
      group.data_scope === activeTenantContext.data_scope
  );
}

export function buildFinanceAccountsEngine(groups = [], collections = []) {
  const activeGroups = groups.filter((group) => group.status === CHIT_GROUP_STATUS.ACTIVE);
  const hasSharedCollections = collections.length > 0;
  const sharedCollectionTotal = collections.reduce((sum, collection) => sum + Number(collection.paid_amount || 0), 0);
  const todayCollections = hasSharedCollections
    ? sharedCollectionTotal
    : groups.reduce((sum, group) => sum + Number(group.today_collections || 0), 0);
  const monthlyCollections = activeGroups.reduce(
    (sum, group) => sum + Number(group.monthly_amount || 0) * Number(group.total_members || 0),
    0
  );
  const pendingCollections = hasSharedCollections
    ? collections.reduce((sum, collection) => sum + Number(collection.pending_amount || 0), 0)
    : groups.reduce((sum, group) => sum + Number(group.pending_collections || 0), 0);
  const openingBalance = Math.round(monthlyCollections * 0.18 + 25000);
  const cashIn = hasSharedCollections
    ? collections
      .filter((collection) => String(collection.payment_method || "").toLowerCase() === "cash")
      .reduce((sum, collection) => sum + Number(collection.paid_amount || 0), 0)
    : Math.round(todayCollections * 0.38);
  const bankIn = Math.max(todayCollections - cashIn, 0);
  const expenses = buildExpenses(todayCollections, monthlyCollections);
  const income = buildIncome(todayCollections, pendingCollections);
  const cashOut = expenses
    .filter((item) => item.payment_mode === "Cash")
    .reduce((sum, item) => sum + item.amount, 0);
  const bankOut = expenses
    .filter((item) => item.payment_mode !== "Cash")
    .reduce((sum, item) => sum + item.amount, 0);
  const bankAccounts = buildBankAccounts({ bankIn, bankOut, monthlyCollections });
  const closingBalance = openingBalance + cashIn - cashOut;
  const bankBalance = bankAccounts.reduce((sum, account) => sum + account.balance, 0);
  const todaysIncome = todayCollections + income.reduce((sum, item) => sum + item.amount, 0);
  const todaysExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const monthlyIncome = monthlyCollections + income.reduce((sum, item) => sum + item.amount, 0);
  const monthlyExpenses = Math.round(todaysExpenses * 22 + monthlyCollections * 0.028);
  const vouchers = buildVouchers({ cashIn, cashOut, bankIn, bankOut, income, expenses });
  const dailyClosing = {
    date: new Date().toISOString().slice(0, 10),
    collections: todayCollections,
    cash: closingBalance,
    bank: bankBalance,
    expenses: todaysExpenses,
    receipts: income.length + (hasSharedCollections ? collections.length : groups.length),
    expected_total: openingBalance + todaysIncome - todaysExpenses,
    actual_total: closingBalance + bankBalance,
  };
  dailyClosing.difference = dailyClosing.actual_total - dailyClosing.expected_total;

  return {
    dashboard: {
      cash_in_hand: closingBalance,
      bank_balance: bankBalance,
      todays_income: todaysIncome,
      todays_expenses: todaysExpenses,
      net_balance: closingBalance + bankBalance,
      monthly_profit: monthlyIncome - monthlyExpenses,
    },
    cashBook: {
      opening_balance: openingBalance,
      cash_in: cashIn,
      cash_out: cashOut,
      closing_balance: closingBalance,
      daily_closing: dailyClosing,
      entries: buildCashEntries({ openingBalance, cashIn, cashOut, closingBalance }),
    },
    bankBook: {
      accounts: bankAccounts,
      deposits: bankIn,
      withdrawals: bankOut,
      transfers: Math.round(bankBalance * 0.08),
      reconciliation: bankAccounts.every((account) => account.reconciled),
    },
    expenses,
    income,
    vouchers,
    dailyClosing,
    reports: buildFinanceReports({
      cashEntries: buildCashEntries({ openingBalance, cashIn, cashOut, closingBalance }),
      bankAccounts,
      income,
      expenses,
      pendingCollections,
      monthlyIncome,
      monthlyExpenses,
    }),
  };
}

export function formatFinanceCurrency(value) {
  return `Rs ${Number(value || 0).toLocaleString("en-IN")}`;
}

function buildExpenses(todayCollections, monthlyCollections) {
  const base = Math.max(todayCollections || monthlyCollections * 0.06, 12000);

  return EXPENSE_CATEGORIES.map((category, index) => ({
    id: `expense-${index + 1}`,
    date: offsetDate(index),
    category,
    description: `${category} operating expense`,
    amount: Math.round(base * (0.05 + index * 0.011)),
    payment_mode: index % 3 === 0 ? "Cash" : "Bank",
    status: index % 4 === 0 ? "Pending Approval" : "Posted",
  }));
}

function buildIncome(todayCollections, pendingCollections) {
  const base = Math.max(todayCollections * 0.08 + pendingCollections * 0.03, 3000);

  return INCOME_CATEGORIES.map((category, index) => ({
    id: `income-${index + 1}`,
    date: offsetDate(index + 1),
    category,
    description: `${category} recorded`,
    amount: Math.round(base * (0.32 - index * 0.035)),
    receipt_no: `INC-${String(index + 1).padStart(3, "0")}`,
  }));
}

function buildBankAccounts({ bankIn, bankOut, monthlyCollections }) {
  const balanceBase = Math.max(monthlyCollections * 0.34, 75000);

  return [
    {
      id: "bank-001",
      bank_name: "State Bank Operating Account",
      account_number: "XXXXXX7890",
      deposits: Math.round(bankIn * 0.6),
      withdrawals: Math.round(bankOut * 0.55),
      transfers: 18000,
      balance: Math.round(balanceBase + bankIn * 0.6 - bankOut * 0.55),
      reconciled: true,
    },
    {
      id: "bank-002",
      bank_name: "HDFC Collections Account",
      account_number: "XXXXXX2345",
      deposits: Math.round(bankIn * 0.4),
      withdrawals: Math.round(bankOut * 0.45),
      transfers: 12000,
      balance: Math.round(balanceBase * 0.72 + bankIn * 0.4 - bankOut * 0.45),
      reconciled: false,
    },
  ];
}

function buildVouchers({ cashIn, cashOut, bankIn, bankOut, income, expenses }) {
  return [
    {
      id: "voucher-001",
      type: "Receipt Voucher",
      date: new Date().toISOString().slice(0, 10),
      narration: "Daily member collections received",
      debit: "Cash / Bank",
      credit: "Collections",
      amount: cashIn + bankIn,
      status: "Posted",
    },
    {
      id: "voucher-002",
      type: "Payment Voucher",
      date: offsetDate(1),
      narration: "Operating expenses paid",
      debit: "Expenses",
      credit: "Cash / Bank",
      amount: cashOut + bankOut,
      status: "Posted",
    },
    {
      id: "voucher-003",
      type: "Journal Voucher",
      date: offsetDate(2),
      narration: "Penalty and discount adjustment",
      debit: "Member Ledger",
      credit: "Income / Discount",
      amount: income[1]?.amount || 0,
      status: "Reviewed",
    },
    {
      id: "voucher-004",
      type: "Contra Voucher",
      date: offsetDate(3),
      narration: "Cash deposited to bank",
      debit: "Bank",
      credit: "Cash",
      amount: Math.round((expenses[0]?.amount || 0) * 2.4),
      status: "Reconciled",
    },
  ];
}

function buildCashEntries({ openingBalance, cashIn, cashOut, closingBalance }) {
  return [
    { id: "cash-001", date: offsetDate(0), particulars: "Opening Balance", cash_in: openingBalance, cash_out: 0, balance: openingBalance },
    { id: "cash-002", date: offsetDate(0), particulars: "Member collections", cash_in: cashIn, cash_out: 0, balance: openingBalance + cashIn },
    { id: "cash-003", date: offsetDate(0), particulars: "Cash expenses", cash_in: 0, cash_out: cashOut, balance: closingBalance },
  ];
}

function buildFinanceReports({ cashEntries, bankAccounts, income, expenses, pendingCollections, monthlyIncome, monthlyExpenses }) {
  return {
    cash_book: cashEntries,
    bank_book: bankAccounts,
    day_book: [
      ...income.map((item) => ({ id: `day-${item.id}`, type: "Income", particulars: item.category, amount: item.amount })),
      ...expenses.map((item) => ({ id: `day-${item.id}`, type: "Expense", particulars: item.category, amount: item.amount })),
    ],
    income_expense: [
      { id: "ie-income", label: "Total Income", amount: income.reduce((sum, item) => sum + item.amount, 0) },
      { id: "ie-expense", label: "Total Expenses", amount: expenses.reduce((sum, item) => sum + item.amount, 0) },
    ],
    profit_loss: [
      { id: "pl-income", label: "Monthly Income", amount: monthlyIncome },
      { id: "pl-expenses", label: "Monthly Expenses", amount: monthlyExpenses },
      { id: "pl-profit", label: "Net Profit", amount: monthlyIncome - monthlyExpenses },
    ],
    outstanding: [
      { id: "outstanding-collections", label: "Pending Collections", amount: pendingCollections },
      { id: "outstanding-approval", label: "Pending Expense Approval", amount: expenses.filter((item) => item.status !== "Posted").reduce((sum, item) => sum + item.amount, 0) },
    ],
  };
}

function offsetDate(offset) {
  const date = new Date();
  date.setDate(date.getDate() - offset);
  return date.toISOString().slice(0, 10);
}
