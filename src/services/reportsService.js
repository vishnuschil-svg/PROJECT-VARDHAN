import { ReportsRepository } from "../repositories/ReportsRepository";
import { ReportsEngine } from "../reports/ReportsEngine";

export function getReportsDashboardModel(activeTenantContext) {
  const source = ReportsRepository.getReportSource(activeTenantContext);
  return ReportsEngine.buildDashboardModel(source);
}

export function getReportCatalog(activeTenantContext) {
  void activeTenantContext;
  return ReportsEngine.getDefinitions().map((definition) => ({
    ...definition,
    route: "/chits/reports",
  }));
}

export function buildEnterpriseReport(reportId, filters = {}, activeTenantContext) {
  const source = ReportsRepository.getReportSource(activeTenantContext);
  return ReportsEngine.buildReport({ reportId, source, filters });
}

export function getReportsPageModel(activeTenantContext, { selectedReportId = "business-summary", filters = {}, search = "" } = {}) {
  const source = ReportsRepository.getReportSource(activeTenantContext);
  const dashboard = ReportsEngine.buildDashboardModel(source);
  const reports = dashboard.reports.filter((report) => {
    const normalizedSearch = String(search || "").trim().toLowerCase();
    return !normalizedSearch || [report.title, report.category, report.description]
      .some((value) => String(value || "").toLowerCase().includes(normalizedSearch));
  });
  const selectedReport = ReportsEngine.buildReport({
    reportId: selectedReportId,
    source,
    filters,
  });

  return {
    ...dashboard,
    reports,
    selectedReport,
    sourceCounts: {
      groups: source.groups.length,
      members: source.members.length,
      collections: source.collections.length,
      receipts: source.receipts.length,
      financeEntries: source.financeEntries.length,
      auctions: source.auctions.length,
    },
    emptyState: {
      title: "No report rows found",
      message: "Adjust filters or complete collections, receipts, finance, member, group, or auction activity to populate this report.",
    },
  };
}

export function exportEnterpriseReport(reportId, format, filters = {}, activeTenantContext) {
  const report = buildEnterpriseReport(reportId, filters, activeTenantContext);
  return ReportsEngine.exportReport({ report, format });
}

export function saveEnterpriseReport(report, activeTenantContext) {
  return ReportsRepository.saveReport(report, activeTenantContext);
}

export function getSavedReports(activeTenantContext) {
  return ReportsRepository.listSavedReports(activeTenantContext);
}
