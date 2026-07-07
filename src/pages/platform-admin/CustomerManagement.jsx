import AdminLayout from "../../components/platform-admin/AdminLayout";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";

function CustomerManagement() {
  const customers = [
    {
      id: 1,
      name: "Tech Solutions",
      email: "contact@techsolutions.com",
      phone: "+91 9876543210",
      status: "active",
      modules: 5,
      subscription: "Enterprise",
      joined: "2024-01-15"
    },
    {
      id: 2,
      name: "Finance Innovations",
      email: "info@financeinno.com",
      phone: "+91 8765432109",
      status: "active",
      modules: 3,
      subscription: "Professional",
      joined: "2024-02-20"
    }
  ];

  const columns = [
    { key: "name", label: "Company", width: "180px" },
    { key: "email", label: "Email", width: "180px" },
    { key: "phone", label: "Phone", width: "130px" },
    { key: "modules", label: "Modules", width: "80px" },
    { key: "subscription", label: "Plan", width: "120px", render: (val) => <Badge label={val} variant="primary" size="small" /> },
    { key: "status", label: "Status", width: "100px", render: (val) => <Badge label={val} variant="success" size="small" /> },
    { key: "joined", label: "Joined", width: "100px" }
  ];

  const actions = [
    { icon: "👁️", label: "View", onClick: () => {}, variant: "default" },
    { icon: "✏️", label: "Edit", onClick: () => {}, variant: "default" },
    { icon: "📞", label: "Contact", onClick: () => {}, variant: "info" }
  ];

  return (
    <AdminLayout 
      title="Customer Management" 
      subtitle="Manage customer accounts and subscriptions"
    >
      <div style={{ background: "var(--bg-primary)", borderRadius: 12, overflow: "hidden" }}>
        <Table columns={columns} data={customers} actions={actions} />
      </div>
    </AdminLayout>
  );
}

export default CustomerManagement;
