import { NavLink } from "react-router-dom";
import "./AdminNavigation.css";

const ADMIN_MENU = [
  { label: "Dashboard", icon: "DB", path: "/admin" },
  { label: "Companies", icon: "CO", path: "/admin/companies" },
  { label: "Company Approval", icon: "OK", path: "/admin/company-approval" },
  { label: "Customer Management", icon: "CU", path: "/admin/customers" },
  { label: "Branch Management", icon: "BR", path: "/admin/branches" },
  { label: "Department Management", icon: "DP", path: "/admin/departments" },
  { label: "Designation Management", icon: "DS", path: "/admin/designations" },
  { label: "Employee Management", icon: "EM", path: "/admin/employees" },
  { label: "User Management", icon: "US", path: "/admin/users" },
  { label: "Roles & Permissions", icon: "RL", path: "/admin/roles" },
  { label: "Product Catalog", icon: "PC", path: "/admin/products" },
  { label: "Module Management", icon: "MD", path: "/admin/modules" },
  { label: "Subscription", icon: "SB", path: "/admin/subscription" },
  { label: "Licenses", icon: "LC", path: "/admin/licenses" },
  { label: "Support Tickets", icon: "SP", path: "/admin/support" },
  { label: "Notifications", icon: "NT", path: "/admin/notifications" },
  { label: "Audit Logs", icon: "AL", path: "/admin/audit-logs" },
  { label: "Backup & Restore", icon: "BK", path: "/admin/backup" },
  { label: "Production Health", icon: "HL", path: "/admin/health" },
  { label: "System Settings", icon: "ST", path: "/admin/settings" },
];

function AdminNavigation() {
  return (
    <nav className="admin-navigation">
      <div className="admin-nav-header">
        <h3>Platform Admin</h3>
      </div>
      <ul className="admin-nav-menu">
        {ADMIN_MENU.map((item) => (
          <li key={item.path} className="admin-nav-item">
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `admin-nav-link ${isActive ? "active" : ""}`
              }
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span className="admin-nav-label">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default AdminNavigation;
