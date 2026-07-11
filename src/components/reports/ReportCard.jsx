import { ArrowRight, FileBarChart } from "lucide-react";

function ReportCard({ report, onOpen }) {
  return (
    <article className="enterprise-report-card">
      <div className="enterprise-report-card-icon" aria-hidden="true">
        <FileBarChart size={19} />
      </div>
      <div className="enterprise-report-card-copy">
        <span>{report.category}</span>
        <h4>{report.title}</h4>
        <p>{report.description}</p>
        <div className="enterprise-report-card-metrics">
          {(report.metrics || []).map((metric) => (
            <strong key={`${report.id}-${metric.label}`}>
              {metric.label}: {metric.displayValue || metric.value}
            </strong>
          ))}
        </div>
      </div>
      <button type="button" className="enterprise-report-card-action" onClick={() => onOpen(report.route)}>
        <ArrowRight size={16} />
      </button>
    </article>
  );
}

export default ReportCard;
