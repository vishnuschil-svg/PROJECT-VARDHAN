function LicenseStatus() {
  return (
    <div className="card solid">
      <h3 style={{ marginTop: 0, marginBottom: 20, color: "var(--text-primary)" }}>License Status</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Active Licenses</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-color)" }}>42/50</span>
          </div>
          <div style={{
            width: "100%",
            height: 8,
            backgroundColor: "var(--bg-tertiary)",
            borderRadius: 4,
            overflow: "hidden"
          }}>
            <div style={{
              width: "84%",
              height: "100%",
              background: "linear-gradient(90deg, var(--accent-color), var(--accent-hover))"
            }}></div>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 8, margin: "8px 0 0 0" }}>
            8 licenses available
          </p>
        </div>
        <div style={{
          padding: 12,
          backgroundColor: "var(--bg-tertiary)",
          borderRadius: 8,
          borderLeft: "3px solid var(--warning-color)"
        }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--warning-color)", margin: 0, marginBottom: 4 }}>
            ⚠️ Renewal Required
          </p>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: 0 }}>
            Enterprise plan expires on Dec 31, 2024
          </p>
        </div>
      </div>
    </div>
  );
}

export default LicenseStatus;
