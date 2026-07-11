export function buildReportCharts(report) {
  const rows = report.rows || [];
  const topRows = [...rows]
    .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
    .slice(0, 5);
  const totalAmount = topRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  return {
    summary: [
      { label: "Records", value: report.totals?.records || 0 },
      { label: "Amount", value: report.totals?.amount || 0, format: "currency" },
      { label: "Pending", value: report.totals?.pendingAmount || 0, format: "currency" },
    ],
    bars: topRows.map((row) => ({
      id: row.id,
      label: row.title || row.date || row.id,
      value: Number(row.amount || 0),
      width: totalAmount ? Math.round((Number(row.amount || 0) / totalAmount) * 100) : 0,
    })),
  };
}
