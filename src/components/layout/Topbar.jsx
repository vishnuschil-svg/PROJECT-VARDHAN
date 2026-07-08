import { useState } from "react";
import { Bell, Menu, Moon, Search, Sun } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { isPlatformOwner } from "../../config/erpModules";

function Topbar({ onMenuToggle }) {
  const {
    user,
    profile,
    role,
    company,
    workspaceOptions,
    activeWorkspace,
    activeTenantContext,
    switchWorkspace,
  } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const userInitial = user?.email?.charAt(0).toUpperCase() || "U";
  const canSwitchWorkspace = isPlatformOwner(profile, role);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="topbar-hamburger" type="button" onClick={onMenuToggle} aria-label="Toggle menu">
          <Menu size={20} />
        </button>

        {company && (
          <div className="topbar-company">
            <p className="topbar-company-label">Active Workspace</p>
            <p className="topbar-company-name">
              {activeWorkspace?.label || company.company_name}
            </p>
            {activeTenantContext && (
              <p className="topbar-workspace-context">
                {activeTenantContext.tenant_id} / {activeTenantContext.data_scope}
              </p>
            )}
          </div>
        )}

        {activeWorkspace && (
          <div className="workspace-switcher">
            <label htmlFor="workspace-switcher">Workspace</label>
            {canSwitchWorkspace ? (
              <select
                id="workspace-switcher"
                value={activeWorkspace.id}
                onChange={(event) => switchWorkspace(event.target.value)}
              >
                {workspaceOptions.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.label} - {workspace.customerName}
                  </option>
                ))}
              </select>
            ) : (
              <span>{activeWorkspace.customerName}</span>
            )}
          </div>
        )}

        <div className="search-bar-wrapper">
          <div className="search-bar">
            <Search size={16} />
            <input type="text" placeholder="Search..." disabled />
          </div>
        </div>
      </div>

      <div className="topbar-right">
        <button className="topbar-button" type="button" title="Notifications" aria-label="Notifications">
          <Bell size={18} />
          <span className="notification-badge">3</span>
        </button>

        <button
          className={`topbar-button ${theme === "dark" ? "active" : ""}`}
          type="button"
          onClick={toggleTheme}
          title="Toggle dark mode"
          aria-label="Toggle dark mode"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="topbar-divider"></div>

        <div className="user-profile">
          <div className="user-info">
            <p className="user-name">{profile?.full_name || "User"}</p>
            <p className="user-role">{profile?.is_platform_admin ? "Platform Admin" : "User"}</p>
          </div>
          <button
            className="user-avatar"
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            title="User menu"
            aria-label="User menu"
          >
            {userInitial}
          </button>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
