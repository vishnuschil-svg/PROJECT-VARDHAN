function LicenseStatus({ model }) {
  if (!model) {
    return null;
  }

  const visibleFeatures = model.license.featureAvailability.slice(0, 6);
  const visiblePermissions = model.workspacePermissions.slice(0, 6);

  return (
    <div className="card solid">
      <h3 style={{ marginTop: 0, marginBottom: 20, color: "var(--text-primary)" }}>
        Security & License
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              {model.license.currentLicense}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-color)", whiteSpace: "nowrap" }}>
              {model.license.seats}
            </span>
          </div>
          <div
            style={{
              width: "100%",
              height: 8,
              backgroundColor: "var(--bg-tertiary)",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${model.license.seatUsageRate}%`,
                height: "100%",
                background: "linear-gradient(90deg, var(--accent-color), var(--accent-hover))",
              }}
            />
          </div>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: "8px 0 0 0" }}>
            {model.license.daysRemaining} remaining - {model.license.productName}
          </p>
        </div>

        <div
          style={{
            padding: 12,
            backgroundColor: "var(--bg-tertiary)",
            borderRadius: 8,
            borderLeft: `3px solid ${model.license.isValid ? "var(--success-color)" : "var(--warning-color)"}`,
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px 0" }}>
            {model.license.status} license
          </p>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: 0 }}>
            Role: {model.role} - Session expires in {model.session.expiresIn}
          </p>
        </div>

        <StatusPillGroup title="Feature Availability" items={visibleFeatures} valueKey="available" />
        <StatusPillGroup title="Workspace Permissions" items={visiblePermissions} valueKey="allowed" />

        <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: 0 }}>
          Audit logs: {model.audit.recentCount} - Actions tracked: {model.audit.actionCount}
        </p>
      </div>
    </div>
  );
}

function StatusPillGroup({ title, items, valueKey }) {
  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px 0" }}>
        {title}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((item) => {
          const enabled = Boolean(item[valueKey]);

          return (
            <span key={item.key} className={`status-badge ${enabled ? "success" : "warning"}`}>
              <span className={`status-dot ${enabled ? "success" : "warning"}`} />
              {item.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default LicenseStatus;
