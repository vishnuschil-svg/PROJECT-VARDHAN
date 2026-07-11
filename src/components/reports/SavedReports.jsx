import { Clock3 } from "lucide-react";

function SavedReports({ reports, scheduleSummary }) {
  return (
    <aside className="enterprise-saved-reports">
      <div className="enterprise-saved-reports-header">
        <Clock3 size={17} />
        <strong>Saved reports</strong>
      </div>
      {(reports || []).length ? (
        <ul>
          {reports.map((report) => (
            <li key={report.id}>
              <span>{report.title}</span>
              <small>{report.updatedAt?.slice(0, 10) || report.createdAt?.slice(0, 10)}</small>
            </li>
          ))}
        </ul>
      ) : (
        <p>No saved reports yet.</p>
      )}
      <small>{scheduleSummary.enabled} scheduled of {scheduleSummary.total}</small>
    </aside>
  );
}

export default SavedReports;
