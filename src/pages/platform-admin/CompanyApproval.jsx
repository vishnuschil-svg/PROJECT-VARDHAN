import { useState } from "react";
import AdminLayout from "../../components/platform-admin/AdminLayout";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";

function CompanyApproval() {
  const [pendingCompanies] = useState([
    {
      id: 3,
      name: "Global Enterprises Ltd",
      owner: "Amit Patel",
      email: "admin@globalent.com",
      type: "Consulting",
      submitted: "2024-06-15",
      documents: 5
    },
    {
      id: 4,
      name: "StartUp Labs",
      owner: "Sarah Chen",
      email: "info@startuplabs.com",
      type: "Technology",
      submitted: "2024-06-16",
      documents: 4
    }
  ]);

  const columns = [
    { key: "name", label: "Company Name", width: "200px" },
    { key: "owner", label: "Owner", width: "150px" },
    { key: "email", label: "Email", width: "180px" },
    { key: "type", label: "Type", width: "120px" },
    { key: "submitted", label: "Submitted", width: "120px" },
    { key: "documents", label: "Documents", width: "100px", render: (val) => <Badge label={`${val} Docs`} variant="primary" size="small" /> }
  ];

  const actions = [
    { icon: "📄", label: "View Docs", onClick: () => {}, variant: "default" },
    { icon: "✅", label: "Approve", onClick: () => {}, variant: "success" },
    { icon: "❌", label: "Reject", onClick: () => {}, variant: "danger" }
  ];

  return (
    <AdminLayout 
      title="Company Approval" 
      subtitle="Review and approve pending company registrations"
    >
      <div style={{ background: "var(--bg-primary)", borderRadius: 12, overflow: "hidden" }}>
        <Table columns={columns} data={pendingCompanies} actions={actions} />
      </div>
    </AdminLayout>
  );
}

export default CompanyApproval;
