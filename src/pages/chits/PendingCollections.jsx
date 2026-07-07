import ChitLayout from "../../components/chit/ChitLayout";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import { mockCollections } from "../../config/chitMockData";
import "./PendingCollections.css";

function PendingCollections() {
  const pendingCollections = mockCollections.filter(c => c.is_partial);

  const columns = [
    { key: "member_id", label: "Member", width: "120px", render: (val) => val === "member-001" ? "Rajesh Kumar" : "Priya Sharma" },
    { key: "collection_month", label: "Month", width: "100px" },
    { key: "installment_amount", label: "Installment", width: "120px", render: (val) => `₹${val.toLocaleString()}` },
    { key: "paid_amount", label: "Paid", width: "100px", render: (val) => `₹${val.toLocaleString()}` },
    { key: "pending_amount", label: "Pending", width: "100px", render: (val) => `₹${val.toLocaleString()}` },
    { key: "payment_date", label: "Payment Date", width: "110px", render: (val) => new Date(val).toLocaleDateString() },
  ];

  const actions = [
    { icon: "💬", label: "Reminder", onClick: () => {}, variant: "warning" },
    { icon: "✏️", label: "Update", onClick: () => {}, variant: "default" },
  ];

  return (
    <ChitLayout
      title="Pending Collections"
      subtitle="Members with partial or pending payments"
    >
      {pendingCollections.length > 0 ? (
        <div style={{ background: "var(--bg-primary)", borderRadius: 12, overflow: "hidden" }}>
          <Table columns={columns} data={pendingCollections} actions={actions} />
        </div>
      ) : (
        <div style={{ background: "var(--bg-primary)", borderRadius: 12, padding: 32, textAlign: "center" }}>
          <p style={{ color: "var(--text-secondary)" }}>No pending collections!</p>
        </div>
      )}
    </ChitLayout>
  );
}

export default PendingCollections;
