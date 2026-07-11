function ReportCharts({ charts }) {
  return (
    <div className="enterprise-report-charts">
      <div className="enterprise-report-chart-summary">
        {(charts.summary || []).map((item) => (
          <span key={item.label}>
            {item.label}
            <strong>{item.displayValue || item.value}</strong>
          </span>
        ))}
      </div>
      <div className="enterprise-report-bars">
        {(charts.bars || []).map((bar) => (
          <div className="enterprise-report-bar" key={bar.id}>
            <span>{bar.label}</span>
            <div>
              <i style={{ width: `${bar.width}%` }} />
            </div>
            <strong>{bar.displayValue || bar.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReportCharts;
