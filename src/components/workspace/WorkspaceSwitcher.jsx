function WorkspaceSwitcher({ workspaces, activeWorkspaceId, onSwitch }) {
  if (!workspaces?.length) {
    return null;
  }

  return (
    <label className="workspace-switcher-control" htmlFor="workspace-engine-switcher">
      <span>Workspace</span>
      <select
        id="workspace-engine-switcher"
        value={activeWorkspaceId || ""}
        onChange={(event) => onSwitch(event.target.value)}
      >
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.businessName} - {workspace.module}
          </option>
        ))}
      </select>
    </label>
  );
}

export default WorkspaceSwitcher;
