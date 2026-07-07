import AdminLayout from "../../components/platform-admin/AdminLayout";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";

function SubscriptionManagement() {
  const subscriptions = [
    { id: 1, company: "Tech Solutions", plan: "Enterprise", amount: "$5,000/mo", status: "active", renewalDate: "2024-07-15", users: "100" },
    { id: 2, company: "Finance Innovations", plan: "Professional", amount: "$2,000/mo", status: "active", renewalDate: "2024-07-20", users: "50" }
  ];

  const columns = [
    { key: "company", label: "Company", width: "150px" },
    { key: "plan", label: "Plan", width: "120px" },
    { key: "amount", label: "Amount", width: "120px", render: (val) => <Badge label={val} variant="primary" size="small" /> },
    { key: "users", label: "Users", width: "80px" },
    { key: "status", label: "Status", width: "100px", render: (val) => <Badge label={val} variant="success" size="small" /> },
    { key: "renewalDate", label: "Renewal", width: "120px" }
  ];

  const actions = [
    { icon: "✏️", label: "Edit", onClick: () => {}, variant: "default" },
    { icon: "💳", label: "Upgrade", onClick: () => {}, variant: "success" },
    { icon: "⏸️", label: "Pause", onClick: () => {}, variant: "warning" }
  ];

  return (
    <AdminLayout 
      title="Subscription Management" 
      subtitle="Manage customer subscriptions and plans"
    >
      <div style={{ background: "var(--bg-primary)", borderRadius: 12, overflow: "hidden" }}>
        <Table columns={columns} data={subscriptions} actions={actions} />
      </div>
    </AdminLayout>
  );
}

export default SubscriptionManagement;
