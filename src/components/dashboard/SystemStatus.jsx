function SystemStatus() {
  const systemStats = [
    { label: "API Status", status: "success" },
    { label: "Database", status: "success" },
    { label: "Cache Server", status: "success" },
    { label: "Email Service", status: "warning" }
  ];

  const getStatusLabel = (status) => {
    if (status === "success") return "Operational";
    if (status === "warning") return "Degraded";
    return "Down";
  };

  return (
    <div className="card solid">
      <h3 style={{ marginTop: 0, marginBottom: 20, color: "var(--text-primary)" }}>System Status</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {systemStats.map((item, idx) => (
          <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{item.label}</span>
            <span className={`status-badge ${item.status}`}>
              <span className={`status-dot ${item.status}`}></span>
              {getStatusLabel(item.status)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SystemStatus;
