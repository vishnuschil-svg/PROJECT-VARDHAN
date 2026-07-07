import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";

function Topbar({ onMenuToggle }) {
  const { user, profile, company } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const userInitial = user?.email?.charAt(0).toUpperCase() || "U";

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="topbar-hamburger" onClick={onMenuToggle}>
          ☰
        </button>

        {company && (
          <div className="topbar-company">
            <p className="topbar-company-label">Organization</p>
            <p className="topbar-company-name">{company.company_name}</p>
          </div>
        )}

        <div className="search-bar-wrapper">
          <div className="search-bar">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Search..."
              disabled
            />
          </div>
        </div>
      </div>

      <div className="topbar-right">
        <button className="topbar-button" title="Notifications">
          🔔
          <span className="notification-badge">3</span>
        </button>

        <button
          className={`topbar-button ${theme === "dark" ? "active" : ""}`}
          onClick={toggleTheme}
          title="Toggle dark mode"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        <div className="topbar-divider"></div>

        <div className="user-profile">
          <div className="user-info">
            <p className="user-name">{profile?.full_name || "User"}</p>
            <p className="user-role">{profile?.is_platform_admin ? "Platform Admin" : "User"}</p>
          </div>
          <div
            className="user-avatar"
            onClick={() => setShowUserMenu(!showUserMenu)}
            title="User menu"
          >
            {userInitial}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
