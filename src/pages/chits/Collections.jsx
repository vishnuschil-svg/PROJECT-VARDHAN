import ChitLayout from "../../components/chit/ChitLayout";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { mockCollections } from "../../config/chitMockData";
import "./Collections.css";

function Collections() {
  const columns = [
    { key: "member_id", label: "Member", width: "120px", render: (val) => val === "member-001" ? "Rajesh Kumar" : "Priya Sharma" },
    { key: "collection_month", label: "Month", width: "100px" },
    { key: "installment_amount", label: "Installment", width: "120px", render: (val) => `₹${val.toLocaleString()}` },
    { key: "paid_amount", label: "Paid", width: "100px", render: (val) => `₹${val.toLocaleString()}` },
    { key: "payment_method", label: "Method", width: "120px" },
    { key: "payment_date", label: "Date", width: "110px", render: (val) => new Date(val).toLocaleDateString() },
    { key: "is_partial", label: "Partial?", width: "80px", render: (val) => <Badge label={val ? "Yes" : "No"} variant={val ? "warning" : "success"} size="small" /> },
  ];

  const actions = [
    { icon: "👁️", label: "View", onClick: () => {}, variant: "default" },
    { icon: "📄", label: "Receipt", onClick: () => {}, variant: "primary" },
    { icon: "✏️", label: "Edit", onClick: () => {}, variant: "default" },
  ];

  return (
    <ChitLayout
      title="Collections"
      subtitle="Track all member payments and collections"
      actions={<Button variant="primary" icon="➕">Record Collection</Button>}
    >
      <div style={{ background: "var(--bg-primary)", borderRadius: 12, overflow: "hidden" }}>
        <Table columns={columns} data={mockCollections} actions={actions} />
      </div>
    </ChitLayout>
  );
}

export default Collections;
