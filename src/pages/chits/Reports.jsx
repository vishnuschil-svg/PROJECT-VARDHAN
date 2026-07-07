import ChitLayout from "../../components/chit/ChitLayout";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import "./Reports.css";

function Reports() {
  const reports = [
    { id: 1, name: "Collection Status", description: "Track all member collections", icon: "📊", type: "collection_status" },
    { id: 2, name: "Member Status", description: "Individual member account summary", icon: "👤", type: "member_status" },
    { id: 3, name: "Financial Summary", description: "Overall group financial report", icon: "💰", type: "financial_summary" },
    { id: 4, name: "Auction History", description: "Past auction results and bids", icon: "🎯", type: "auction_history" },
    { id: 5, name: "Dividend Report", description: "Dividend calculations and payouts", icon: "📈", type: "dividend_report" },
  ];

  return (
    <ChitLayout
      title="Reports"
      subtitle="Generate and view chit reports and analytics"
    >
      <div className="reports-grid">
        {reports.map((report) => (
          <div key={report.id} className="report-card">
            <div className="report-icon">{report.icon}</div>
            <h3>{report.name}</h3>
            <p>{report.description}</p>
            <div className="report-actions">
              <Button variant="primary" size="small" icon="📋" fullWidth>View Report</Button>
              <Button variant="default" size="small" icon="📥" fullWidth>Download</Button>
            </div>
          </div>
        ))}
      </div>
    </ChitLayout>
  );
}

export default Reports;
