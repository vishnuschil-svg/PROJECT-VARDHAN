import { useState } from "react";
import { ArrowRight, FileBarChart2 } from "lucide-react";
import { DEFAULT_REPORT_FILTERS } from "../../reports/ReportFilters";
import ReportCard from "./ReportCard";
import ReportCharts from "./ReportCharts";
import ReportExportMenu from "./ReportExportMenu";
import ReportFilters from "./ReportFilters";
import SavedReports from "./SavedReports";

function ReportsDashboard({ model, onOpenReports, onExport }) {
  const [filters, setFilters] = useState(DEFAULT_REPORT_FILTERS);
  const featuredReports = (model.reports || []).slice(0, 4);
  const mergeFilters = (patch) => setFilters((current) => ({
    ...current,
    ...patch,
    dateRange: { ...current.dateRange, ...(patch.dateRange || {}) },
    amount: { ...current.amount, ...(patch.amount || {}) },
  }));

  return (
    <section className="enterprise-reports-widget" aria-label="Enterprise reports engine">
      <div className="enterprise-reports-header">
        <div>
          <span className="royal-dashboard-eyebrow">Enterprise Reports Engine</span>
          <h3>{model.title}</h3>
          <p>{model.description}</p>
        </div>
        <button type="button" className="enterprise-reports-open" onClick={onOpenReports}>
          Open Reports
          <ArrowRight size={16} />
        </button>
      </div>

      <div className="enterprise-reports-body">
        <div className="enterprise-reports-main">
          <div className="enterprise-reports-hero">
            <div className="enterprise-reports-icon" aria-hidden="true">
              <FileBarChart2 size={22} />
            </div>
            <div>
              <strong>{model.featuredReport.title}</strong>
              <span>{model.featuredReport.status} - {model.featuredReport.totals.records} records</span>
            </div>
          </div>
          <ReportCharts charts={model.charts} />
          <ReportFilters filters={filters} options={model.filters} onChange={mergeFilters} />
          <ReportExportMenu
            formats={model.exportFormats}
            onExport={(format) => onExport(model.featuredReport.id, format, filters)}
          />
        </div>

        <div className="enterprise-reports-list">
          {featuredReports.map((report) => (
            <ReportCard key={report.id} report={report} onOpen={onOpenReports} />
          ))}
        </div>

        <SavedReports reports={model.savedReports} scheduleSummary={model.scheduleSummary} />
      </div>
    </section>
  );
}

export default ReportsDashboard;
