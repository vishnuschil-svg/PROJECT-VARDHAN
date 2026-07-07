import { NavLink } from "react-router-dom";
import "./AdminNavigation.css";

const ADMIN_MENU = [
  { label: "Dashboard", icon: "📊", path: "/admin" },
  { label: "Companies", icon: "🏢", path: "/admin/companies" },
  { label: "Company Approval", icon: "✅", path: "/admin/company-approval" },
  { label: "Customer Management", icon: "👥", path: "/admin/customers" },
  { label: "User Management", icon: "👤", path: "/admin/users" },
  { label: "Roles & Permissions", icon: "🔐", path: "/admin/roles" },
  { label: "Module Management", icon: "🔧", path: "/admin/modules" },
  { label: "Subscription", icon: "💳", path: "/admin/subscription" },
  { label: "Licenses", icon: "📜", path: "/admin/licenses" },
  { label: "Support Tickets", icon: "🆘", path: "/admin/support" },
  { label: "Notifications", icon: "🔔", path: "/admin/notifications" },
  { label: "Audit Logs", icon: "📋", path: "/admin/audit-logs" },
  { label: "Backup & Restore", icon: "💾", path: "/admin/backup" },
  { label: "System Settings", icon: "⚙️", path: "/admin/settings" }
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
