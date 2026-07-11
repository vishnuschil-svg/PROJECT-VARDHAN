function WorkspaceStatus({ workspace, health }) {
  if (!workspace || !health) {
    return null;
  }

  return (
    <div className="workspace-status-strip" aria-label="Workspace status">
      <span>{workspace.status}</span>
      <span>{health.licenseBadge}</span>
      <span>{health.currentPlan}</span>
      <strong>{health.score}% {health.status}</strong>
    </div>
  );
}

export default WorkspaceStatus;
