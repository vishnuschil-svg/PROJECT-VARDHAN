import { AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { formatReportCurrency } from "../../reports/ReportFormatter";

function ReportSummary({ model, report }) {
  const validation = report?.validation || { errors: [], warnings: [] };

  return (
    <div className="report-summary-grid">
      <div>
        <span>Total Reports</span>
        <strong>{model.reports.length}</strong>
      </div>
      <div>
        <span>Rows</span>
        <strong>{report?.totals?.records || 0}</strong>
      </div>
      <div>
        <span>Amount</span>
        <strong>{formatReportCurrency(report?.totals?.amount || 0)}</strong>
      </div>
      <div>
        <span>Export</span>
        <strong><Download size={18} /> Ready</strong>
      </div>
      <div>
        <span>Validation</span>
        <strong>{validation.isValid ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />} {validation.errors.length + validation.warnings.length}</strong>
      </div>
    </div>
  );
}

export default ReportSummary;
