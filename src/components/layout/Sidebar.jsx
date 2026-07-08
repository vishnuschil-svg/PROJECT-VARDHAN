import { NavLink } from "react-router-dom";
import { getAccessibleModules, isPlatformOwner, PLATFORM_NAME } from "../../config/erpModules";
import { getProductsWithSubscriptionState } from "../../config/productLicensing";
import { useAuth } from "../../hooks/useAuth";

const PLATFORM_MENU = [
  { label: "Platform Admin", icon: "AD", path: "/admin" },
  { label: "Customers", icon: "CU", path: "/admin/customers" },
  { label: "Branches", icon: "BR", path: "/admin/branches" },
  { label: "Departments", icon: "DP", path: "/admin/departments" },
  { label: "Designations", icon: "DS", path: "/admin/designations" },
  { label: "Employees", icon: "EM", path: "/admin/employees" },
  { label: "Product Catalog", icon: "PC", path: "/admin/products" },
  { label: "Module Management", icon: "MD", path: "/admin/modules" },
  { label: "License Management", icon: "LC", path: "/admin/licenses" },
  { label: "Subscription", icon: "SB", path: "/admin/subscription" },
  { label: "Notifications", icon: "NT", path: "/admin/notifications" },
  { label: "Support", icon: "SP", path: "/admin/support" },
  { label: "Audit Logs", icon: "AL", path: "/admin/audit-logs" },
];

const SYSTEM_MENU = [
  { label: "Settings", icon: "ST", path: "/admin/settings" },
  { label: "Profile", icon: "PR", path: "/profile" },
  { label: "Logout", icon: "LO", path: "/logout" },
];

function Sidebar({ isOpen, onClose }) {
  const { profile, role, modules, activeWorkspace } = useAuth();
  const canViewPlatform = isPlatformOwner(profile, role);
  const productMenu = canViewPlatform
    ? getProductsWithSubscriptionState(activeWorkspace)
    : getAccessibleModules(modules, profile, role);

  const menuStructure = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "DB",
      path: "/dashboard",
      type: "link",
    },
    {
      id: "products",
      label: "ERP PRODUCTS",
      type: "section",
      items: [
        { label: "Product Catalog", icon: "PC", path: "/products/catalog" },
        ...productMenu
          .filter((module) => canViewPlatform || module.subscribed !== false)
          .map((module) => ({
        label: module.name,
        icon: module.shortName,
        path: module.path,
          })),
      ],
    },
    canViewPlatform && {
      id: "platform",
      label: "PLATFORM",
      type: "section",
      items: PLATFORM_MENU,
    },
    {
      id: "system",
      label: "SYSTEM",
      type: "section",
      items: canViewPlatform ? SYSTEM_MENU : SYSTEM_MENU.filter((item) => item.path !== "/admin/settings"),
    },
  ].filter(Boolean);

  const handleLinkClick = () => {
    if (window.innerWidth <= 768) {
      onClose?.();
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="sidebar-header">
        <h2>{PLATFORM_NAME}</h2>
      </div>

      <div className="sidebar-content">
        {menuStructure.map((item) => {
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
