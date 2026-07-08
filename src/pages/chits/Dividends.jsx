import { CheckCircle, Eye } from "lucide-react";
import ChitLayout from "../../components/chit/ChitLayout";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import { mockDividends } from "../../config/chitMockData";
import { formatCurrency } from "../../config/chitPhaseOneData";
import "./Dividends.css";

function Dividends() {
  const columns = [
    { key: "member_id", label: "Member", width: "120px", render: (val) => val === "member-001" ? "Rajesh Kumar" : "Priya Sharma" },
    { key: "dividend_month", label: "Month", width: "100px" },
    { key: "dividend_amount", label: "Dividend", width: "130px", render: formatCurrency },
    { key: "calculation_basis", label: "Basis", width: "130px", render: (val) => val.replace(/_/g, " ") },
    { key: "dividend_date", label: "Date", width: "120px", render: (val) => new Date(val).toLocaleDateString("en-IN") },
    { key: "status", label: "Status", width: "100px", render: (val) => <Badge label={val} variant={val === "paid" ? "success" : val === "calculated" ? "primary" : "warning"} size="small" /> },
  ];

  const actions = [
    { icon: <Eye size={15} />, label: "View", onClick: () => {}, variant: "default" },
    { icon: <CheckCircle size={15} />, label: "Approve", onClick: () => {}, variant: "success" },
  ];

  return (
    <ChitLayout
      title="Dividends"
      subtitle="Dividend calculation and distribution"
    >
      <div style={{ background: "var(--bg-primary)", borderRadius: 12, overflow: "hidden" }}>
        <Table columns={columns} data={mockDividends} actions={actions} />
      </div>
    </ChitLayout>
  );
}

export default Dividends;
