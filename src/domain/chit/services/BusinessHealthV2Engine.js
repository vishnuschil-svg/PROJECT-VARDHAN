export const BusinessHealthV2Engine = {
  calculate(source = {}) {
    const metrics = [
      metric("Collection Discipline", ratioScore(sum(source.collections, "paid_amount"), sumExpected(source))),
      metric("Pending Risk", 100 - ratioScore(sum(source.collections, "pending_amount"), sumExpected(source))),
      metric("Cash Flow Health", ratioScore(sum(source.financeEntries, "cash_in") + sum(source.financeEntries, "bank_in"), Math.max(1, sum(source.financeEntries, "cash_out") + sum(source.financeEntries, "bank_out")))),
      metric("Payout Readiness", 100 - ratioScore(sum(source.payouts, "pendingAmount"), sum(source.payouts, "totalPayout"))),
      metric("Profitability", profitScore(source)),
      metric("Expense Control", 100 - ratioScore(sum(source.expenses, "amount"), Math.max(1, sum(source.collections, "paid_amount")))),
      metric("Member Retention", 100 - ratioScore((source.members || []).filter((member) => String(member.status).toLowerCase() === "inactive").length, Math.max(1, (source.members || []).length))),
      metric("Reconciliation Health", source.reconciliation?.status === "FAIL" ? 30 : source.reconciliation?.status === "WARNING" ? 70 : 95),
      metric("Data Quality", (source.unconfirmedFields || 0) > 0 ? 60 : 95),
      metric("Operational Compliance", (source.openIssues || 0) > 0 ? 65 : 95),
      metric("Investor Exposure", 100 - ratioScore(sum(source.investorTransactions, "amount"), Math.max(1, sum(source.collections, "paid_amount") + sum(source.payouts, "totalPayout")))),
      metric("Growth Readiness", (source.groups || []).length > 0 ? 85 : 50),
    ];
    const overallScore = Math.round(metrics.reduce((total, item) => total + item.score, 0) / metrics.length);
    return {
      overallScore,
      status: statusFor(overallScore),
      metrics,
      warnings: metrics.filter((item) => item.score < 70).map((item) => `${item.name} needs attention.`),
      recommendations: metrics.filter((item) => item.score < 80).map((item) => `Review ${item.name}.`),
      explanations: Object.fromEntries(metrics.map((item) => [item.name, item.explanation])),
      dataAsOf: new Date().toISOString(),
    };
  },
};

function metric(name, score) {
  const safeScore = Math.max(0, Math.min(100, Math.round(Number(score || 0))));
  return { name, score: safeScore, explanation: `${name} score is ${safeScore}, calculated from repository totals.` };
}

function ratioScore(value, total) {
  if (!Number(total || 0)) return 100;
  return Math.max(0, Math.min(100, (Number(value || 0) / Number(total || 0)) * 100));
}

function profitScore(source) {
  const income = sum(source.collections, "paid_amount") + sum(source.financeEntries, "cash_in") + sum(source.financeEntries, "bank_in");
  const expenses = sum(source.expenses, "amount");
  return income >= expenses ? 90 : 50;
}

function sum(rows = [], field) {
  return rows.reduce((total, row) => total + Number(row[field] || 0), 0);
}

function sumExpected(source) {
  const group = (source.groups || [])[0] || {};
  return Number(group.monthly_amount || 0) * Number(group.total_members || (source.members || []).length || 1);
}

function statusFor(score) {
  if (score >= 90) return "EXCELLENT";
  if (score >= 78) return "HEALTHY";
  if (score >= 62) return "ATTENTION";
  if (score >= 45) return "HIGH_RISK";
  return "CRITICAL";
}
