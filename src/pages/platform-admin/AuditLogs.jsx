import AdminLayout from "../../components/platform-admin/AdminLayout";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";

function AuditLogs() {
  const logs = [
    { id: 1, timestamp: "2024-06-15 14:32", user: "Admin User", action: "Company Approved", entity: "Tech Solutions", status: "success" },
    { id: 2, timestamp: "2024-06-15 13:45", user: "Rajesh Kumar", action: "User Created", entity: "new_user@company.com", status: "success" },
    { id: 3, timestamp: "2024-06-15 12:10", user: "System", action: "Backup Completed", entity: "Database", status: "success" },
    { id: 4, timestamp: "2024-06-15 11:20", user: "Admin", action: "Module Disabled", entity: "CRM", status: "warning" }
  ];

  const columns = [
    { key: "timestamp", label: "Timestamp", width: "160px" },
    { key: "user", label: "User", width: "140px" },
    { key: "action", label: "Action", width: "150px" },
    { key: "entity", label: "Entity", width: "180px" },
    { key: "status", label: "Status", width: "100px", render: (val) => (
      <Badge label={val} variant={val === "success" ? "success" : "warning"} size="small" />
    )}
  ];

  return (
    <AdminLayout 
      title="Audit Logs" 
      subtitle="View all system and user actions for compliance and security"
    >
      <div style={{ background: "var(--bg-primary)", borderRadius: 12, overflow: "hidden" }}>
        <Table columns={columns} data={logs} />
      </div>
    </AdminLayout>
  );
}

export default AuditLogs;
