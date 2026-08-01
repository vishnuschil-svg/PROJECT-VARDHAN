const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function getLedgerVisibleRecords({ members = [], groups = [], activeTenantContext, platformOwner = false }) {
  const canViewAll = platformOwner && !activeTenantContext?.tenant_id;

  if (canViewAll) {
    return { members, groups };
  }

  if (!activeTenantContext?.tenant_id || !activeTenantContext?.data_scope) {
    return { members: [], groups: [] };
  }

  return {
    members: members.filter(
      (member) =>
        member.tenant_id === activeTenantContext.tenant_id &&
        member.data_scope === activeTenantContext.data_scope
    ),
    groups: groups.filter(
      (group) =>
        group.tenant_id === activeTenantContext.tenant_id &&
        group.data_scope === activeTenantContext.data_scope
    ),
  };
}

export function buildMemberLedger({ member, group, collections = [] }) {
  if (!member || !group) {
    return createEmptyLedger();
  }

  const monthlyAmount = Number(group.monthly_amount || 0);
  const securityDeposit = Math.round(monthlyAmount * 0.35);
  const openingBalance = 0;
  const monthsElapsed = Math.max(
    1,
    Math.min(Number(group.total_months || 1), getMonthDifference(group.start_date, new Date()) + 1)
  );
  const memberCollections = collections.filter(
    (collection) =>
      collection.member_id === member.id &&
      (collection.chit_group_id === group.id || collection.group_id === group.id)
  );
  const paidMonths = memberCollections.filter(
    (collection) => Number(collection.paid_amount || 0) > 0
  ).length;
  const pendingInstallments = Math.max(monthsElapsed - paidMonths, 0);
  const transactions = buildCollectionTransactions({
    collections: memberCollections,
    group,
    securityDeposit,
  });
  const totals = transactions.reduce(
    (sum, transaction) => ({
      collection: sum.collection + transaction.collection,
      fine: sum.fine + transaction.fine,
      discount: sum.discount + transaction.discount,
      dividend: sum.dividend + transaction.dividend,
      lift: sum.lift + transaction.lift,
      adjustment: sum.adjustment + transaction.adjustment,
    }),
    { collection: 0, fine: 0, discount: 0, dividend: 0, lift: 0, adjustment: 0 }
  );
  const outstandingBalance = Math.max(
    openingBalance +
      securityDeposit +
      (memberCollections.length
        ? Math.max(monthsElapsed * monthlyAmount - totals.collection, 0)
        : pendingInstallments * monthlyAmount) +
      totals.fine -
      totals.collection -
      totals.discount -
      totals.dividend -
      totals.adjustment,
    0
  );

  return {
    opening_balance: openingBalance,
    security_deposit: securityDeposit,
    total_installments_paid: totals.collection,
    pending_installments: pendingInstallments * monthlyAmount,
    fine: totals.fine,
    discount: totals.discount,
    dividend_received: totals.dividend,
    lift_amount: totals.lift,
    outstanding_balance: outstandingBalance,
    lift_status: totals.lift > 0 ? "Lifted" : "Not Lifted",
    transactions,
    timeline: buildTimeline({ member, group, transactions }),
  };
}

export function filterLedgerTransactions(transactions = [], filters = {}) {
  return transactions.filter((transaction) => {
    const matchesDate = !filters.date || transaction.date === filters.date;
    const matchesYear =
      !filters.financialYear || getFinancialYear(transaction.date) === filters.financialYear;
    return matchesDate && matchesYear;
  });
}

export function getFinancialYearOptions(transactions = []) {
  return Array.from(new Set(transactions.map((transaction) => getFinancialYear(transaction.date)))).sort().reverse();
}

export function buildPassbookPayload({ member, group, ledger, businessName = "VARDHAN Chit Business" }) {
  return {
    business_name: businessName,
    member_name: member?.member_name || "",
    member_number: member?.member_number || "",
    mobile_number: member?.mobile_number || "",
    chit_group: group?.chit_name || "",
    chit_code: group?.chit_code || "",
    generated_at: new Date().toISOString(),
    summary: ledger,
    transactions: ledger?.transactions || [],
  };
}

export function createPassbookSvg(payload) {
  const rows = payload.transactions.slice(0, 10).map((transaction, index) => {
    const y = 448 + index * 48;
    return `
      <text x="54" y="${y}" ${cellStyle}>${escapeXml(transaction.receipt_no)}</text>
      <text x="180" y="${y}" ${cellStyle}>${escapeXml(formatDate(transaction.date))}</text>
      <text x="300" y="${y}" ${cellStyle}>${escapeXml(transaction.month)}</text>
      <text x="420" y="${y}" ${moneyStyle}>${transaction.collection.toLocaleString("en-IN")}</text>
      <text x="540" y="${y}" ${moneyStyle}>${transaction.dividend.toLocaleString("en-IN")}</text>
      <text x="660" y="${y}" ${moneyStyle}>${transaction.lift.toLocaleString("en-IN")}</text>
      <text x="780" y="${y}" ${moneyStyle}>${transaction.balance.toLocaleString("en-IN")}</text>
    `;
  }).join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1180" viewBox="0 0 1000 1180">
      <rect width="1000" height="1180" fill="#eef3fb"/>
      <rect x="34" y="34" width="932" height="1112" rx="30" fill="#ffffff" stroke="#d4af37" stroke-width="2"/>
      <rect x="34" y="34" width="932" height="210" rx="30" fill="#07111f"/>
      <text x="70" y="92" font-family="Segoe UI, Arial" font-size="24" font-weight="900" fill="#f3c969">${escapeXml(payload.business_name)}</text>
      <text x="70" y="142" font-family="Segoe UI, Arial" font-size="46" font-weight="900" fill="#ffffff">Member Passbook</text>
      <text x="70" y="188" font-family="Segoe UI, Arial" font-size="20" fill="#cbd5e1">${escapeXml(payload.member_name)} / ${escapeXml(payload.member_number)}</text>
      <text x="70" y="222" font-family="Segoe UI, Arial" font-size="18" fill="#93c5fd">${escapeXml(payload.chit_group)} (${escapeXml(payload.chit_code)})</text>

      <rect x="70" y="280" width="860" height="108" rx="18" fill="#f8fbff" stroke="#cbd5e1"/>
      ${summaryText("Total Paid", payload.summary.total_installments_paid, 110, 330)}
      ${summaryText("Pending", payload.summary.pending_installments, 330, 330)}
      ${summaryText("Dividend", payload.summary.dividend_received, 550, 330)}
      ${summaryText("Outstanding", payload.summary.outstanding_balance, 760, 330)}

      <text x="54" y="426" ${headerStyle}>Receipt</text>
      <text x="180" y="426" ${headerStyle}>Date</text>
      <text x="300" y="426" ${headerStyle}>Month</text>
      <text x="420" y="426" ${headerStyle}>Collection</text>
      <text x="540" y="426" ${headerStyle}>Dividend</text>
      <text x="660" y="426" ${headerStyle}>Lift</text>
      <text x="780" y="426" ${headerStyle}>Balance</text>
      <line x1="54" y1="438" x2="930" y2="438" stroke="#dbe3ef"/>
      ${rows}

      <rect x="70" y="1040" width="860" height="58" rx="16" fill="#ecfdf5" stroke="#10b981"/>
      <text x="500" y="1076" text-anchor="middle" font-family="Segoe UI, Arial" font-size="20" font-weight="900" fill="#047857">Tenant-aware digital passbook generated by VARDHAN ERP PLATFORM</text>
    </svg>
  `;
}

export function createPassbookImageUrl(payload) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(createPassbookSvg(payload))}`;
}

export function createPassbookImageFile(payload) {
  return new File([createPassbookSvg(payload)], `${payload.member_number}-passbook.svg`, {
    type: "image/svg+xml",
  });
}

export function createPassbookPdfFile(payload) {
  const body = [
    payload.business_name,
    "Member Passbook",
    `${payload.member_name} / ${payload.member_number}`,
    `${payload.chit_group} (${payload.chit_code})`,
    "",
    `Total Paid: ${formatLedgerCurrency(payload.summary.total_installments_paid)}`,
    `Pending: ${formatLedgerCurrency(payload.summary.pending_installments)}`,
    `Dividend: ${formatLedgerCurrency(payload.summary.dividend_received)}`,
    `Lift Amount: ${formatLedgerCurrency(payload.summary.lift_amount)}`,
    `Outstanding: ${formatLedgerCurrency(payload.summary.outstanding_balance)}`,
    "",
    "Transactions",
    ...payload.transactions.map(
      (item) =>
        `${item.receipt_no} | ${formatDate(item.date)} | ${item.month} | Collection ${formatLedgerCurrency(item.collection)} | Balance ${formatLedgerCurrency(item.balance)}`
    ),
  ].join("\n");

  return new File([body], `${payload.member_number}-passbook.pdf`, {
    type: "application/pdf",
  });
}

export function buildPassbookWhatsAppMessage(payload) {
  return [
    `Member Passbook - ${payload.business_name}`,
    `Member: ${payload.member_name} (${payload.member_number})`,
    `Chit Group: ${payload.chit_group}`,
    `Total Paid: ${formatLedgerCurrency(payload.summary.total_installments_paid)}`,
    `Pending: ${formatLedgerCurrency(payload.summary.pending_installments)}`,
    `Outstanding: ${formatLedgerCurrency(payload.summary.outstanding_balance)}`,
  ].join("\n");
}

export function formatLedgerCurrency(value) {
  return `Rs ${Number(value || 0).toLocaleString("en-IN")}`;
}

function buildCollectionTransactions({ collections, group, securityDeposit }) {
  let balance = securityDeposit;

  return [...collections]
    .sort((a, b) => new Date(a.payment_date || a.created_at) - new Date(b.payment_date || b.created_at))
    .map((collection, index) => {
      const date = (collection.payment_date || collection.created_at || new Date().toISOString()).slice(0, 10);
      const installment = Number(collection.installment_amount || group.monthly_amount || 0);
      const paid = Number(collection.paid_amount || 0);
      const fine = Number(collection.fine_amount || 0);
      const discount = Number(collection.discount_amount || 0);
      const dividend = Number(collection.dividend_adjustment || 0);
      const adjustment = dividend - fine + discount;

      balance = Math.max(balance + installment + fine - paid - discount - dividend, Number(collection.pending_amount || 0));

      return {
        id: collection.id || `${group.id}-collection-${index + 1}`,
        receipt_no: collection.receipt_number || "-",
        date,
        month: formatCollectionMonth(collection.collection_month, date),
        chit_group_id: group.id,
        collection: paid,
        fine,
        discount,
        dividend,
        lift: 0,
        adjustment,
        balance,
      };
    });
}

function formatCollectionMonth(monthValue, fallbackDate) {
  const date = monthValue ? new Date(`${monthValue}-01`) : new Date(fallbackDate);
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function buildTimeline({ member, group, transactions }) {
  return [
    {
      id: `${member.id}-joined`,
      date: member.join_date || group.start_date,
      title: "Member joined",
      description: `${member.member_name} joined ${group.chit_name}.`,
      tone: "good",
    },
    ...transactions.map((transaction) => ({
      id: transaction.id,
      date: transaction.date,
      title: transaction.lift > 0 ? "Lift amount posted" : transaction.collection > 0 ? "Installment collected" : "Installment pending",
      description:
        transaction.lift > 0
          ? `Lift amount ${formatLedgerCurrency(transaction.lift)} posted.`
          : transaction.collection > 0
            ? `Collection ${formatLedgerCurrency(transaction.collection)} received for ${transaction.month}.`
            : `Pending installment for ${transaction.month}.`,
      tone: transaction.collection > 0 || transaction.lift > 0 ? "good" : "risk",
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function createEmptyLedger() {
  return {
    opening_balance: 0,
    security_deposit: 0,
    total_installments_paid: 0,
    pending_installments: 0,
    fine: 0,
    discount: 0,
    dividend_received: 0,
    lift_amount: 0,
    outstanding_balance: 0,
    lift_status: "Not Lifted",
    transactions: [],
    timeline: [],
  };
}

function getMonthDifference(startDate, endDate) {
  const start = new Date(startDate || endDate);
  const end = new Date(endDate);
  return (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
}

function getFinancialYear(dateValue) {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const startsInCurrentYear = date.getMonth() >= 3;
  return startsInCurrentYear ? `${year}-${String(year + 1).slice(-2)}` : `${year - 1}-${String(year).slice(-2)}`;
}

function formatDate(dateValue) {
  return new Date(dateValue).toLocaleDateString("en-IN");
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

const headerStyle = 'font-family="Segoe UI, Arial" font-size="17" font-weight="900" fill="#334155"';
const cellStyle = 'font-family="Segoe UI, Arial" font-size="16" fill="#0f172a"';
const moneyStyle = 'font-family="Segoe UI, Arial" font-size="16" font-weight="800" fill="#0f172a"';

function summaryText(label, value, x, y) {
  return `
    <text x="${x}" y="${y}" font-family="Segoe UI, Arial" font-size="16" font-weight="900" fill="#64748b">${label}</text>
    <text x="${x}" y="${y + 34}" font-family="Segoe UI, Arial" font-size="25" font-weight="900" fill="#07111f">${formatLedgerCurrency(value)}</text>
  `;
}
