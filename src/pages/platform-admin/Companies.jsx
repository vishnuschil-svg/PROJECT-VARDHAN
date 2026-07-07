import { useState } from "react";
import AdminLayout from "../../components/platform-admin/AdminLayout";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import Modal from "../../components/common/Modal";
import FormField from "../../components/common/FormField";

function Companies() {
  const [companies, setCompanies] = useState([
    {
      id: 1,
      name: "Tech Solutions Pvt Ltd",
      owner: "Rajesh Kumar",
      mobile: "+91 9876543210",
      email: "info@techsolutions.com",
      type: "IT Services",
      modules: 5,
      subscription: "Enterprise",
      license: "Active",
      status: "approved",
      created: "2024-01-15"
    },
    {
      id: 2,
      name: "Finance Innovations Inc",
      owner: "Priya Sharma",
      mobile: "+91 8765432109",
      email: "contact@financeinno.com",
      type: "Finance",
      modules: 3,
      subscription: "Professional",
      license: "Active",
      status: "approved",
      created: "2024-02-20"
    }
  ]);

  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const columns = [
    { key: "name", label: "Company Name", width: "180px" },
    { key: "owner", label: "Owner", width: "120px" },
    { key: "email", label: "Email", width: "150px" },
    { key: "type", label: "Type", width: "100px" },
    { key: "modules", label: "Modules", width: "80px", render: (val) => <Badge label={`${val} Enabled`} variant="primary" size="small" /> },
    { key: "subscription", label: "Subscription", width: "120px", render: (val) => <Badge label={val} variant="info" size="small" /> },
    { key: "status", label: "Status", width: "100px", render: (val) => (
      <Badge
        label={val.charAt(0).toUpperCase() + val.slice(1)}
        variant={val === "approved" ? "success" : val === "pending" ? "warning" : "error"}
        size="small"
      />
    )},
    { key: "created", label: "Created", width: "100px" }
  ];

  const actions = [
    { icon: "👁️", label: "View", onClick: (row) => { setSelectedCompany(row); setShowModal(true); }, variant: "default" },
    { icon: "✏️", label: "Edit", onClick: () => {}, variant: "default" },
    { icon: "✅", label: "Approve", onClick: () => {}, variant: "success" },
    { icon: "❌", label: "Reject", onClick: () => {}, variant: "danger" },
    { icon: "⏸️", label: "Suspend", onClick: () => {}, variant: "warning" },
    { icon: "🔄", label: "Activate", onClick: () => {}, variant: "success" },
    { icon: "🗑️", label: "Delete", onClick: () => {}, variant: "danger" }
  ];

  return (
    <AdminLayout 
      title="Companies" 
      subtitle="Manage all registered companies on the platform"
      actions={<Button variant="primary" icon="➕">New Company</Button>}
    >
      <div style={{ background: "var(--bg-primary)", borderRadius: 12, overflow: "hidden" }}>
        <Table columns={columns} data={companies} actions={actions} />
      </div>

      <Modal
        isOpen={showModal}
        title="Company Details"
        onClose={() => setShowModal(false)}
        size="large"
      >
        {selectedCompany && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FormField label="Company Name" value={selectedCompany.name} disabled />
            <FormField label="Owner Name" value={selectedCompany.owner} disabled />
            <FormField label="Email" type="email" value={selectedCompany.email} disabled />
            <FormField label="Mobile" value={selectedCompany.mobile} disabled />
            <FormField label="Business Type" value={selectedCompany.type} disabled />
            <FormField label="Subscription" value={selectedCompany.subscription} disabled />
            <FormField label="License Status" value={selectedCompany.license} disabled />
            <FormField label="Status" value={selectedCompany.status} disabled />
            <FormField label="Created Date" value={selectedCompany.created} disabled />
            <FormField label="Modules Enabled" value={`${selectedCompany.modules}`} disabled />
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}

export default Companies;
