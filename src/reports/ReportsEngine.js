import { buildFilterOptions } from "./ReportFilters";
import { buildReportCharts } from "./ReportCharts";
import {
  buildDashboardStats,
  buildEnterpriseReport,
  buildReportsCatalog,
  getDefaultReportDefinitions,
} from "./ReportBuilder";
import { REPORT_EXPORT_FORMATS, buildReportExport } from "./ReportExport";
import { buildScheduleSummary } from "./ReportScheduler";
import { ReportValidator } from "./ReportValidator";

export const ReportsEngine = {
  getDefinitions() {
    return getDefaultReportDefinitions();
  },

  buildDashboardModel(source) {
    const stats = buildDashboardStats(source);
    const catalog = buildReportsCatalog(source);
    const featuredReport = this.buildReport({
      reportId: "business-summary",
      source,
      filters: {},
    });

    return {
      title: "Enterprise Reports Engine",
      description: "Reusable reports for Chit, School, College, and Hostels ERP workspaces.",
      stats,
      reports: catalog,
      featuredReport,
      charts: buildReportCharts(featuredReport),
      filters: buildFilterOptions(source),
      exportFormats: REPORT_EXPORT_FORMATS,
      savedReports: source.savedReports || [],
      scheduleSummary: buildScheduleSummary(source.schedules || []),
      actionRoute: "/chits/reports",
    };
  },

  buildReport({ reportId, source, filters }) {
    const report = buildEnterpriseReport({ reportId, source, filters });
    const validation = ReportValidator.validate({
      reportId,
      source,
      filters: report.filters,
      rows: report.rows,
    });

    return {
      ...report,
      validation,
      charts: buildReportCharts(report),
    };
  },

  exportReport({ report, format }) {
    return buildReportExport(report, format);
  },
};
