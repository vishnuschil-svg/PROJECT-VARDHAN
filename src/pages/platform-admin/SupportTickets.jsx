import AdminLayout from "../../components/platform-admin/AdminLayout";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";

function SupportTickets() {
  const tickets = [
    { id: "TKT-001", company: "Tech Solutions", subject: "Login issue", priority: "high", status: "open", created: "2024-06-15", assignee: "Support Team" },
    { id: "TKT-002", company: "Finance Innovations", subject: "Feature request", priority: "low", status: "in-progress", created: "2024-06-14", assignee: "Dev Team" }
  ];

  const columns = [
    { key: "id", label: "Ticket ID", width: "100px" },
    { key: "company", label: "Company", width: "150px" },
    { key: "subject", label: "Subject", width: "180px" },
    { key: "priority", label: "Priority", width: "100px", render: (val) => (
      <Badge label={val} variant={val === "high" ? "error" : val === "medium" ? "warning" : "info"} size="small" />
    )},
    { key: "status", label: "Status", width: "120px", render: (val) => (
      <Badge label={val} variant={val === "closed" ? "success" : val === "open" ? "error" : "warning"} size="small" />
    )},
    { key: "assignee", label: "Assigned To", width: "120px" },
    { key: "created", label: "Created", width: "100px" }
  ];

  const actions = [
    { icon: "💬", label: "Reply", onClick: () => {}, variant: "default" },
    { icon: "👤", label: "Assign", onClick: () => {}, variant: "default" },
    { icon: "✅", label: "Close", onClick: () => {}, variant: "success" }
  ];

  return (
    <AdminLayout 
      title="Support Tickets" 
      subtitle="Manage customer support tickets"
      actions={<Button variant="primary" icon="➕">New Ticket</Button>}
    >
      <div style={{ background: "var(--bg-primary)", borderRadius: 12, overflow: "hidden" }}>
        <Table columns={columns} data={tickets} actions={actions} />
      </div>
    </AdminLayout>
  );
}

export default SupportTickets;
