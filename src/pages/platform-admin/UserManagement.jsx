import { useState } from "react";
import AdminLayout from "../../components/platform-admin/AdminLayout";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import Modal from "../../components/common/Modal";
import FormField from "../../components/common/FormField";

function UserManagement() {
  const [users] = useState([
    {
      id: 1,
      name: "Admin User",
      email: "admin@vardhan.com",
      company: "VARDHAN",
      role: "Platform Admin",
      status: "active",
      lastLogin: "Today"
    },
    {
      id: 2,
      name: "Rajesh Kumar",
      email: "rajesh@techsolutions.com",
      company: "Tech Solutions",
      role: "Company Owner",
      status: "active",
      lastLogin: "Yesterday"
    }
  ]);

  const columns = [
    { key: "name", label: "Name", width: "150px" },
    { key: "email", label: "Email", width: "200px" },
    { key: "company", label: "Company", width: "150px" },
    { key: "role", label: "Role", width: "130px" },
    { key: "status", label: "Status", width: "100px", render: (val) => (
      <Badge label={val} variant={val === "active" ? "success" : "warning"} size="small" />
    )},
    { key: "lastLogin", label: "Last Login", width: "120px" }
  ];

  const actions = [
    { icon: "✏️", label: "Edit", onClick: () => {}, variant: "default" },
    { icon: "🔐", label: "Reset Password", onClick: () => {}, variant: "warning" },
    { icon: "🚫", label: "Suspend", onClick: () => {}, variant: "danger" }
  ];

  return (
    <AdminLayout 
      title="User Management" 
      subtitle="Manage all platform users and their roles"
      actions={<Button variant="primary" icon="➕">Add User</Button>}
    >
      <div style={{ background: "var(--bg-primary)", borderRadius: 12, overflow: "hidden" }}>
        <Table columns={columns} data={users} actions={actions} />
      </div>
    </AdminLayout>
  );
}

export default UserManagement;
