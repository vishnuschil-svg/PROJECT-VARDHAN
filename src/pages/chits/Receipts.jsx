import ChitLayout from "../../components/chit/ChitLayout";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { mockReceipts } from "../../config/chitMockData";
import "./Receipts.css";

function Receipts() {
  const columns = [
    { key: "receipt_number", label: "Receipt #", width: "110px" },
    { key: "member_id", label: "Member", width: "120px", render: (val) => val === "member-001" ? "Rajesh Kumar" : "Priya Sharma" },
    { key: "amount", label: "Amount", width: "110px", render: (val) => `₹${val.toLocaleString()}` },
    { key: "payment_date", label: "Date", width: "120px", render: (val) => new Date(val).toLocaleDateString() },
    { key: "payment_method", label: "Method", width: "130px" },
    { key: "can_print_pdf", label: "PDF", width: "70px", render: (val) => <Badge label={val ? "Yes" : "No"} variant={val ? "success" : "error"} size="small" /> },
  ];

  const actions = [
    { icon: "👁️", label: "View", onClick: () => {}, variant: "default" },
    { icon: "📑", label: "Print", onClick: () => {}, variant: "primary" },
    { icon: "💬", label: "WhatsApp", onClick: () => {}, variant: "success" },
    { icon: "📥", label: "Download", onClick: () => {}, variant: "default" },
  ];

  return (
    <ChitLayout
      title="Receipts"
      subtitle="Payment receipts and documents"
      actions={<Button variant="primary" icon="📄">Generate Receipt</Button>}
    >
      <div style={{ background: "var(--bg-primary)", borderRadius: 12, overflow: "hidden" }}>
        <Table columns={columns} data={mockReceipts} actions={actions} />
      </div>
    </ChitLayout>
  );
}

export default Receipts;
