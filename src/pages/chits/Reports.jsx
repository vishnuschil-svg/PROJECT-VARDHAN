import {
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import ChitLayout from "../../components/chit/ChitLayout";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Table from "../../components/common/Table";
import {
  buildReportsEngine,
  createReportCsv,
  createReportExportText,
  createReportPrintHtml,
  getReportHeaders,
  toTitle,
} from "../../config/chitReportsEngine";
import { CHIT_PRODUCT_NAME } from "../../config/erpModules";
import { useAuth } from "../../hooks/useAuth";
import { useTenantCollections } from "../../services/chitCollectionsStore";
import { listTenantGroups, listTenantMembers } from "../../services/chitDataService";
import "./Reports.css";

function Reports() {
  const { activeTenantContext } = useAuth();
  const collections = useTenantCollections(activeTenantContext);
  const [selectedReportId, setSelectedReportId] = useState("daily_report");
  const [searchTerm, setSearchTerm] = useState("");

  const tenantGroups = useMemo(
    () => listTenantGroups(activeTenantContext),
    [activeTenantContext]
  );
  const tenantMembers = useMemo(
    () => listTenantMembers(activeTenantContext),
    [activeTenantContext]
  );
  const reports = useMemo(
    () => buildReportsEngine({
      groups: tenantGroups,
      members: tenantMembers,
      collections,
      activeTenantContext,
    }),
    [activeTenantContext, collections, tenantGroups, tenantMembers]
  );
  const selectedReport = reports.find((report) => report.id === selectedReportId) || reports[0];
  const filteredReports = reports.filter((report) => {
    const search = searchTerm.trim().toLowerCase();
    return !search || [report.title, report.category].some((value) => value.toLowerCase().includes(search));
  });
  const columns = buildColumns(selectedReport?.rows || []);

  const exportReport = (format) => {
    if (!selectedReport) return;

    if (format === "print") {
      const printWindow = window.open("", "_blank", "noopener,noreferrer");
      if (!printWindow) return;
      printWindow.document.write(createReportPrintHtml(selectedReport));
      printWindow.document.close();
      return;
    }

    const isExcel = format === "excel";
    const content = isExcel ? createReportCsv(selectedReport) : createReportExportText(selectedReport);
    const type = isExcel ? "text/csv;charset=utf-8" : "application/pdf";
    const extension = isExcel ? "csv" : "pdf";
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedReport.id}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ChitLayout
      title="Reports Engine"
      subtitle={`${CHIT_PRODUCT_NAME} operational, ledger, finance and outstanding reports`}
    >
      <div className="reports-page">
        <section className="reports-hero">
          <div>
            <span>Tenant-aware reporting console</span>
            <h2>Reports Engine</h2>
            <p>
              Daily, monthly, yearly, ledger, collection, auction, dividend, finance
              and outstanding reports are generated from current workspace data.
            </p>
          </div>
          <div className="reports-security-chip">
            <ShieldCheck size={18} />
            <strong>{activeTenantContext?.workspace_label || "Active Workspace"}</strong>
            <span>{activeTenantContext?.tenant_id || "No tenant selected"}</span>
          </div>
        </section>

        <section className="reports-workbench">
          <aside className="reports-catalog">
            <div className="reports-search">
              <Search size={16} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search reports"
              />
            </div>

            <div className="reports-list">
              {filteredReports.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  className={`report-select-card ${selectedReport?.id === report.id ? "active" : ""}`}
                  onClick={() => setSelectedReportId(report.id)}
                >
                  <span>{report.category}</span>
                  <strong>{report.title}</strong>
                  <small>{report.rows.length} rows</small>
                </button>
              ))}
            </div>
          </aside>

          <main className="reports-main">
            <div className="report-detail-header">
              <div>
                <Badge label={selectedReport?.category || "Report"} variant="primary" size="small" />
                <h3>{selectedReport?.title}</h3>
                <p>
                  Generated {new Date(selectedReport?.generated_at).toLocaleString("en-IN")} /
                  {" "}{selectedReport?.workspace_label}
                </p>
              </div>
              <div className="report-export-actions">
                <Button variant="default" icon={<FileText size={16} />} onClick={() => exportReport("pdf")}>
                  PDF
                </Button>
                <Button variant="default" icon={<FileSpreadsheet size={16} />} onClick={() => exportReport("excel")}>
                  Excel
                </Button>
                <Button variant="primary" icon={<Printer size={16} />} onClick={() => exportReport("print")}>
                  Print
                </Button>
              </div>
            </div>

            <div className="report-summary-grid">
              <div>
                <span>Total Reports</span>
                <strong>{reports.length}</strong>
              </div>
              <div>
                <span>Rows</span>
                <strong>{selectedReport?.rows.length || 0}</strong>
              </div>
              <div>
                <span>Export</span>
                <strong><Download size={18} /> Ready</strong>
              </div>
            </div>

            <div className="report-table-card">
              <Table columns={columns} data={selectedReport?.rows || []} />
            </div>
          </main>
        </section>
      </div>
    </ChitLayout>
  );
}

function buildColumns(rows) {
  return getReportHeaders(rows).map((header) => ({
    key: header,
    label: toTitle(header),
    width: header.length > 16 ? "180px" : "140px",
    render: (value) => formatReportValue(header, value),
  }));
}

function formatReportValue(key, value) {
  if (typeof value !== "number") return value || "-";
  const moneyKeys = ["amount", "cash", "bank", "income", "expense", "balance", "pending", "collection", "profit", "dividend", "lift", "outstanding", "target", "value"];
  const isMoney = moneyKeys.some((item) => key.toLowerCase().includes(item));
  return isMoney ? `Rs ${Number(value || 0).toLocaleString("en-IN")}` : Number(value || 0).toLocaleString("en-IN");
}

export default Reports;
