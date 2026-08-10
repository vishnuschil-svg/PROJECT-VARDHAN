import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppShell, Header, PageShell, Sidebar } from "../../design-system";
import { useAuth } from "../../hooks/useAuth";
import { getChitMenu } from "./ChitNavigation.menu.js";
import "./GroupManagerShell.css";

function resolveActiveItem(menu, pathname) {
  return [...menu]
    .sort((left, right) => right.path.length - left.path.length)
    .find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
}

function GroupManagerShell({ title, subtitle, actions, children, floatingAction }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeWorkspace, permissions, profile, role } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const menu = useMemo(
    () => getChitMenu({ permissions, profile, role }),
    [permissions, profile, role]
  );
  const activeItem = resolveActiveItem(menu, location.pathname);
  const pageTitle = title || activeItem?.label || "Group Manager";
  const workspaceName =
    activeWorkspace?.name ||
    activeWorkspace?.business_name ||
    profile?.business_name ||
    "Active workspace";
  const userName = profile?.full_name || profile?.name || "Organizer";
  const userInitial = userName.trim().charAt(0).toUpperCase() || "V";
  const breadcrumbItems = [
    { label: "VARDHAN", path: "/dashboard" },
    { label: "Group Manager", path: "/chits" },
    ...(location.pathname === "/chits" ? [] : [{ label: pageTitle }]),
  ];

  return (
    <AppShell
      className="chit-layout group-manager-shell"
      sidebar={
        <Sidebar
          brandName="VARDHAN Group Manager"
          brandMark="V"
          items={menu}
          activePath={activeItem?.path}
          collapsed={sidebarCollapsed}
          onNavigate={(path) => path && navigate(path)}
          footer={<span className="group-manager-shell__sidebar-footer">Secure workspace</span>}
        />
      }
      header={
        <Header
          context={
            <div className="group-manager-shell__context">
              <button
                type="button"
                className="group-manager-shell__collapse"
                aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
                aria-expanded={!sidebarCollapsed}
                onClick={() => setSidebarCollapsed((current) => !current)}
              >
                {sidebarCollapsed ? "›" : "‹"}
              </button>
              <span>
                <strong>Group Manager</strong>
                <small>{workspaceName}</small>
              </span>
            </div>
          }
          actions={
            <div className="group-manager-shell__header-actions">
              <button type="button" onClick={() => navigate("/dashboard")}>All apps</button>
              <span className="group-manager-shell__avatar" title={userName} aria-label={`Signed in as ${userName}`}>
                {userInitial}
              </span>
            </div>
          }
        />
      }
    >
      <PageShell
        title={pageTitle}
        subtitle={subtitle}
        breadcrumbItems={breadcrumbItems}
        breadcrumbNavigate={(path) => path && navigate(path)}
        actions={actions}
        className="group-manager-shell__page"
      >
        <div className="chit-page-content">{children}</div>
      </PageShell>
      {floatingAction}
    </AppShell>
  );
}

export default GroupManagerShell;
