import { LocalStorageRepository } from "./LocalStorageRepository";

export const ReportsRepository = new LocalStorageRepository({
  storageKey: "vardhan.chit.reports.v1",
  entityName: "report",
  searchableFields: [
    "report_type",
    "report_name",
    "title",
    "category",
    "status",
  ],
  normalize: (report) => ({
    ...report,
    total_amount: Number(report.total_amount || 0),
    rows: Array.isArray(report.rows) ? report.rows : [],
  }),
  sort: (a, b) => new Date(b.generated_at || b.created_at || 0) - new Date(a.generated_at || a.created_at || 0),
});
