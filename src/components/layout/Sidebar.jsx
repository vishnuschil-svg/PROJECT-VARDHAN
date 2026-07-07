import { useState } from "react";
import { NavLink } from "react-router-dom";

const MENU_STRUCTURE = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "📊",
    path: "/dashboard",
    type: "link"
  },
  {
    id: "products",
    label: "ERP PRODUCTS",
    type: "section",
    items: [
      { label: "MITRA NIDHI CHITI PRO", icon: "🏦", path: "/chits" },
      { label: "School ERP", icon: "🎓", path: "/products/school" },
      { label: "College ERP", icon: "🎒", path: "/products/college" },
      { label: "Finance ERP", icon: "💰", path: "/products/finance" },
      { label: "Hospital ERP", icon: "🏥", path: "/products/hospital" },
      { label: "Apartment ERP", icon: "🏢", path: "/products/apartment" },
      { label: "Inventory ERP", icon: "📦", path: "/products/inventory" },
      { label: "HR & Payroll", icon: "👥", path: "/products/hr" },
      { label: "CRM", icon: "👔", path: "/products/crm" }
    ]
  },
  {
    id: "platform",
    label: "PLATFORM",
    type: "section",
    items: [
      { label: "Platform Admin", icon: "⚙️", path: "/admin" },
      { label: "Customers", icon: "👤", path: "/admin/customers" },
      { label: "Module Management", icon: "🔧", path: "/admin/modules" },
      { label: "License Management", icon: "📜", path: "/admin/licenses" },
      { label: "Subscription", icon: "💳", path: "/admin/subscription" },
      { label: "Notifications", icon: "🔔", path: "/admin/notifications" },
      { label: "Support", icon: "🆘", path: "/admin/support" },
      { label: "Audit Logs", icon: "📋", path: "/admin/audit-logs" }
    ]
  },
  {
    id: "system",
    label: "SYSTEM",
    type: "section",
    items: [
      { label: "Settings", icon: "⚡", path: "/admin/settings" },
      { label: "Profile", icon: "👤", path: "/profile" },
      { label: "Logout", icon: "🚪", path: "/logout" }
    ]
  }
];

function Sidebar({ isOpen, onClose }) {
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (id) => {
    setExpandedSections(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleLinkClick = () => {
    if (window.innerWidth <= 768) {
      onClose();
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>VARDHAN ERP</h2>
      </div>

      <div className="sidebar-content">
        {MENU_STRUCTURE.map((item) => {
          if (item.type === "link") {
            return (
              <div key={item.id} className="sidebar-section">
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `sidebar-menu-link ${isActive ? "active" : ""}`
                  }
                  onClick={handleLinkClick}
                >
                  <span className="sidebar-menu-icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              </div>
            );
          }

          if (item.type === "section") {
            const isExpanded = expandedSections[item.id];
            return (
              <div key={item.id} className="sidebar-section">
                <h3 className="sidebar-section-title">{item.label}</h3>
                <ul className="sidebar-menu">
                  {item.items.map((subitem) => (
                    <li key={subitem.label} className="sidebar-menu-item">
                      <NavLink
                        to={subitem.path}
                        className={({ isActive }) =>
                          `sidebar-submenu-link ${isActive ? "active" : ""}`
                        }
                        onClick={handleLinkClick}
                      >
                        <span className="sidebar-menu-icon">{subitem.icon}</span>
                        {subitem.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          }

          return null;
        })}
      </div>
    </aside>
  );
}

export default Sidebar;
