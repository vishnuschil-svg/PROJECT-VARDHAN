import { Bell, Search, Settings, X } from "lucide-react";
import WorkspaceCard from "../workspace/WorkspaceCard";
import WorkspaceStatus from "../workspace/WorkspaceStatus";
import WorkspaceSwitcher from "../workspace/WorkspaceSwitcher";

function DashboardHeader({
  workspace,
  workspaceHealth,
  workspaces = [],
  onWorkspaceSwitch,
  searchValue,
  onSearchChange,
  onSearchClear,
  onNotificationsClick,
  unreadCount = 0,
  onSettingsClick,
}) {
  return (
    <header className="royal-dashboard-header" aria-label="Enterprise dashboard header">
      <div className="royal-dashboard-header-copy">
        <span>Royal Enterprise Dashboard</span>
        <h1>{workspace?.businessName || "Business command centre"}</h1>
        <WorkspaceStatus workspace={workspace} health={workspaceHealth} />
      </div>

      <div className="royal-dashboard-header-actions">
        <WorkspaceCard workspace={workspace} />
        <WorkspaceSwitcher
          workspaces={workspaces}
          activeWorkspaceId={workspace?.id}
          onSwitch={onWorkspaceSwitch}
        />
        <label className="royal-dashboard-search" htmlFor="royal-dashboard-search">
          <Search size={18} aria-hidden="true" />
          <input
            id="royal-dashboard-search"
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search chits, members, collections"
          />
          {searchValue ? (
            <button type="button" onClick={onSearchClear} aria-label="Clear search">
              <X size={16} />
            </button>
          ) : null}
        </label>

        <button
          className="royal-dashboard-icon-button"
          type="button"
          onClick={onNotificationsClick}
          title="Open notifications"
          aria-label="Open notifications"
        >
          <Bell size={19} />
          {unreadCount > 0 ? (
            <span className="royal-dashboard-unread-count" aria-label={`${unreadCount} unread notifications`}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>

        <button
          className="royal-dashboard-icon-button"
          type="button"
          onClick={onSettingsClick}
          title="Open settings"
          aria-label="Open settings"
        >
          <Settings size={19} />
        </button>
      </div>
    </header>
  );
}

export default DashboardHeader;
