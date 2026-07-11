function WorkspaceCard({ workspace }) {
  if (!workspace) {
    return null;
  }

  return (
    <div className="workspace-card-summary" aria-label="Current workspace">
      <div className="workspace-card-logo" aria-hidden="true">
        {workspace.logo}
      </div>
      <div className="workspace-card-copy">
        <span>{workspace.businessType}</span>
        <strong>{workspace.businessName}</strong>
        <small>{workspace.owner} / Last login {workspace.lastLogin}</small>
      </div>
    </div>
  );
}

export default WorkspaceCard;
