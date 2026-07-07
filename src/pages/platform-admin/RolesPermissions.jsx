import { useState } from "react";
import AdminLayout from "../../components/platform-admin/AdminLayout";
import Tabs from "../../components/common/Tabs";
import Badge from "../../components/common/Badge";
import Table from "../../components/common/Table";
import "./RolesPermissions.css";

function RolesPermissions() {
  const roles = [
    {
      id: 1,
      name: "Platform Admin",
      icon: "👑",
      description: "Full access to all features",
      permissions: ["All"]
    },
    {
      id: 2,
      name: "Company Owner",
      icon: "🏢",
      description: "Owner of company account",
      permissions: ["Company Management", "User Management", "License Management"]
    },
    {
      id: 3,
      name: "Admin",
      icon: "⚙️",
      description: "Company administrator",
      permissions: ["Module Management", "User Management", "Reports"]
    },
    {
      id: 4,
      name: "Manager",
      icon: "📊",
      description: "Department manager",
      permissions: ["Team Management", "Reports", "Approvals"]
    },
    {
      id: 5,
      name: "Staff",
      icon: "👤",
      description: "Regular staff member",
      permissions: ["Basic Operations", "View Reports"]
    },
    {
      id: 6,
      name: "Viewer",
      icon: "👁️",
      description: "Read-only access",
      permissions: ["View Only"]
    }
  ];

  const permissionMatrix = [
    { feature: "Company Management", platformAdmin: "✅", owner: "✅", admin: "❌", manager: "❌", staff: "❌", viewer: "❌" },
    { feature: "User Management", platformAdmin: "✅", owner: "✅", admin: "✅", manager: "❌", staff: "❌", viewer: "❌" },
    { feature: "Module Management", platformAdmin: "✅", owner: "✅", admin: "✅", manager: "❌", staff: "❌", viewer: "❌" },
    { feature: "License Management", platformAdmin: "✅", owner: "✅", admin: "❌", manager: "❌", staff: "❌", viewer: "❌" },
    { feature: "Audit Logs", platformAdmin: "✅", owner: "✅", admin: "✅", manager: "✅", staff: "❌", viewer: "❌" },
    { feature: "Reports", platformAdmin: "✅", owner: "✅", admin: "✅", manager: "✅", staff: "✅", viewer: "✅" },
    { feature: "Settings", platformAdmin: "✅", owner: "✅", admin: "❌", manager: "❌", staff: "❌", viewer: "❌" }
  ];

  const tabs = [
    {
      label: "📋 Roles",
      icon: "🔐",
      content: (
        <div className="roles-list">
          {roles.map((role) => (
            <div key={role.id} className="role-card">
              <div className="role-header">
                <span className="role-icon">{role.icon}</span>
                <div className="role-info">
                  <h3>{role.name}</h3>
                  <p>{role.description}</p>
                </div>
              </div>
              <div className="role-permissions">
                {role.permissions.map((perm, idx) => (
                  <Badge key={idx} label={perm} variant="primary" size="small" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )
    },
    {
      label: "🔐 Permission Matrix",
      icon: "📊",
      content: (
        <div className="permission-matrix">
          <table className="matrix-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Platform Admin</th>
                <th>Owner</th>
                <th>Admin</th>
                <th>Manager</th>
                <th>Staff</th>
                <th>Viewer</th>
              </tr>
            </thead>
            <tbody>
              {permissionMatrix.map((row, idx) => (
                <tr key={idx}>
                  <td className="feature-name">{row.feature}</td>
                  <td>{row.platformAdmin}</td>
                  <td>{row.owner}</td>
                  <td>{row.admin}</td>
                  <td>{row.manager}</td>
                  <td>{row.staff}</td>
                  <td>{row.viewer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
  ];

  return (
    <AdminLayout 
      title="Roles & Permissions" 
      subtitle="Manage user roles and their permissions"
    >
      <div style={{ background: "var(--bg-primary)", borderRadius: 12, overflow: "hidden" }}>
        <Tabs tabs={tabs} />
      </div>
    </AdminLayout>
  );
}

export default RolesPermissions;
