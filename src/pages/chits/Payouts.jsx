import ChitLayout from "../../components/chit/ChitLayout";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { mockPayouts } from "../../config/chitMockData";
import "./Payouts.css";

function Payouts() {
  const columns = [
    { key: "member_id", label: "Member", width: "120px", render: (val) => val === "member-001" ? "Rajesh Kumar" : "Priya Sharma" },
    { key: "payout_month", label: "Month", width: "100px" },
    { key: "chit_amount", label: "Chit Amount", width: "130px", render: (val) => `₹${val.toLocaleString()}` },
    { key: "foreman_commission", label: "Commission", width: "120px", render: (val) => `₹${val.toLocaleString()}` },
    { key: "total_payout_amount", label: "Total Payout", width: "130px", render: (val) => `₹${val.toLocaleString()}` },
    { key: "status", label: "Status", width: "100px", render: (val) => <Badge label={val} variant={val === "paid" ? "success" : val === "pending" ? "warning" : "error"} size="small" /> },
  ];

  const actions = [
    { icon: "👁️", label: "View", onClick: () => {}, variant: "default" },
    { icon: "✅", label: "Approve", onClick: () => {}, variant: "success" },
    { icon: "💳", label: "Mark Paid", onClick: () => {}, variant: "primary" },
  ];

  return (
    <ChitLayout
      title="Payouts"
      subtitle="Track chit amount payouts to winners"
      actions={<Button variant="primary" icon="➕">New Payout</Button>}
    >
      <div style={{ background: "var(--bg-primary)", borderRadius: 12, overflow: "hidden" }}>
        <Table columns={columns} data={mockPayouts} actions={actions} />
      </div>
    </ChitLayout>
  );
}

export default Payouts;
