import {
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
import HelpButton from "../../components/common/HelpButton";
import ReportExportMenu from "../../components/reports/ReportExportMenu";
import ReportFilters from "../../components/reports/ReportFilters";
import ReportSummary from "../../components/reports/ReportSummary";
import ReportTable from "../../components/reports/ReportTable";
import { DEFAULT_REPORT_FILTERS } from "../../reports/ReportFilters";
import { CHIT_PRODUCT_NAME } from "../../config/erpModules";
import { useAuth } from "../../hooks/useAuth";
import {
  exportEnterpriseReport,
  getReportsPageModel,
} from "../../services/reportsService";
import "./Reports.css";

function Reports() {
  const { activeTenantContext } = useAuth();
  const [selectedReportId, setSelectedReportId] = useState("business-summary");
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState(DEFAULT_REPORT_FILTERS);
  const [error, setError] = useState("");
  const model = useMemo(
    () => getReportsPageModel(activeTenantContext, {
      selectedReportId,
      filters,
      search: searchTerm,
    }),
    [activeTenantContext, selectedReportId, filters, searchTerm]
  );
  const selectedReport = model.selectedReport;

  const mergeFilters = (patch) => {
    setFilters((current) => ({
      ...current,
      ...patch,
      dateRange: { ...current.dateRange, ...(patch.dateRange || {}) },
      amount: { ...current.amount, ...(patch.amount || {}) },
    }));
  };

  const exportReport = (format) => {
    try {
      const result = exportEnterpriseReport(selectedReport.id, format, filters, activeTenantContext);

      if (format === "Print") {
        const printWindow = window.open("", "_blank", "noopener,noreferrer");
        if (!printWindow) return;
        printWindow.document.write(result.content);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        return;
      }

      downloadExport(result.fileName, result.content, result.mimeType);
    } catch (err) {
      setError(err.message || "Unable to export report.");
    }
  };

  return (
    <ChitLayout
      title="Reports Engine"
      subtitle={`${CHIT_PRODUCT_NAME} operational, ledger, finance and outstanding reports`}
      actions={<HelpButton feature="REPORTS" variant="secondary"/>}
    >
      <div className="reports-page">
        <section className="reports-hero">
          <div>
            <span>Tenant-aware reporting console</span>
            <h2>Reports Engine</h2>
            <p>
              Business, collection, ledger, passbook, auction, receipt and finance reports are generated from the same repository data used by dashboard, collections, receipts and finance.
            </p>
          </div>
          <div className="reports-security-chip">
            <ShieldCheck size={18} />
            <strong>{activeTenantContext?.workspace_label || "Active Workspace"}</strong>
            <span>{activeTenantContext?.tenant_id || "No tenant selected"}</span>
          </div>
        </section>

        {error && <div className="report-error-state">{error}</div>}

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
              {model.reports.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  className={`report-select-card ${selectedReport?.id === report.id ? "active" : ""}`}
                  onClick={() => setSelectedReportId(report.id)}
                >
                  <span>{report.category}</span>
                  <strong>{report.title}</strong>
                  <small>{report.status}</small>
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
                  Generated {new Date(selectedReport?.generatedAt).toLocaleString("en-IN")} /
                  {" "}{selectedReport?.module}
                </p>
              </div>
              <div className="report-export-actions">
                <Button variant="default" icon={<FileText size={16} />} onClick={() => exportReport("PDF")}>
                  PDF
                </Button>
                <Button variant="default" icon={<FileSpreadsheet size={16} />} onClick={() => exportReport("Excel")}>
                  Excel
                </Button>
                <Button variant="primary" icon={<Printer size={16} />} onClick={() => exportReport("Print")}>
                  Print
                </Button>
              </div>
            </div>

            <ReportFilters filters={filters} options={model.filters} onChange={mergeFilters} />
            <ReportExportMenu formats={model.exportFormats} onExport={exportReport} />
            <ReportSummary model={model} report={selectedReport} />

            {(selectedReport.validation.errors.length > 0 || selectedReport.validation.warnings.length > 0) && (
              <div className="report-validation-panel">
                {selectedReport.validation.errors.map((item) => <span className="error" key={item}>{item}</span>)}
                {selectedReport.validation.warnings.map((item) => <span key={item}>{item}</span>)}
              </div>
            )}

            <div className="report-table-card">
              {selectedReport.rows.length ? (
                <ReportTable report={selectedReport} />
              ) : (
                <div className="report-empty-state">
                  <FileText size={34} />
                  <h3>{model.emptyState.title}</h3>
                  <p>{model.emptyState.message}</p>
                </div>
              )}
            </div>
          </main>
        </section>
      </div>
    </ChitLayout>
  );
}

function downloadExport(fileName, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export default Reports;
