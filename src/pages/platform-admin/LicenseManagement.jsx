import AdminLayout from "../../components/platform-admin/AdminLayout";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";

function LicenseManagement() {
  const licenses = [
    { id: 1, company: "Tech Solutions", type: "Professional", count: "50", used: "48", expiry: "2024-12-31", status: "active" },
    { id: 2, company: "Finance Innovations", type: "Enterprise", count: "100", used: "95", expiry: "2024-11-30", status: "warning" }
  ];

  const columns = [
    { key: "company", label: "Company", width: "150px" },
    { key: "type", label: "Type", width: "120px" },
    { key: "count", label: "Total", width: "80px" },
    { key: "used", label: "Used", width: "80px" },
    { key: "expiry", label: "Expires", width: "120px" },
    { key: "status", label: "Status", width: "100px", render: (val) => <Badge label={val} variant={val === "active" ? "success" : "warning"} size="small" /> }
  ];

  const actions = [
    { icon: "➕", label: "Add", onClick: () => {}, variant: "success" },
    { icon: "🔄", label: "Renew", onClick: () => {}, variant: "primary" },
    { icon: "✏️", label: "Edit", onClick: () => {}, variant: "default" }
  ];

  return (
    <AdminLayout 
      title="License Management" 
      subtitle="Manage software licenses for customers"
    >
      <div style={{ background: "var(--bg-primary)", borderRadius: 12, overflow: "hidden" }}>
        <Table columns={columns} data={licenses} actions={actions} />
      </div>
    </AdminLayout>
  );
}

export default LicenseManagement;
