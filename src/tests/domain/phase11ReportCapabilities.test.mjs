import test from "node:test";
import assert from "node:assert/strict";
import { getDefaultReportDefinitions, buildEnterpriseReport } from "../../reports/ReportBuilder.js";
import { buildReportExport } from "../../reports/ReportExport.js";

test("report catalog contains every required operational and financial report", () => {
  const titles = getDefaultReportDefinitions().map((report) => report.title);
  for (const title of ["Cash Book Report", "Member Ledger", "Monthly Collection Report", "Auction Report", "Pending Collection Report", "Profit Report", "Trial Balance"]) {
    assert.ok(titles.includes(title), title);
  }
});

test("trial balance exposes debit, credit, and balance columns", () => {
  const report = buildEnterpriseReport({ reportId: "trial-balance", source: { financeEntries: [
    { id: "income", category: "Collections", type: "income", amount: 1000, cash_in: 1000 },
    { id: "expense", category: "Office", type: "expense", amount: 200, cash_out: 200 },
  ] } });
  assert.deepEqual(report.columns, ["title", "status", "debit", "credit", "balance"]);
  assert.equal(report.rows.length, 2);
});

test("PDF, Excel, and Print exports produce ready content", () => {
  const report = { id: "test", title: "Test", columns: ["title"], rows: [{ title: "Row" }] };
  for (const format of ["PDF", "Excel", "Print"]) {
    const output = buildReportExport(report, format);
    assert.equal(output.format, format);
    assert.ok(output.content.length > 0);
  }
});
