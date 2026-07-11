function SupportCard() {
  return (
    <div className="card solid">
      <h3 style={{ marginTop: 0, marginBottom: 20, color: "var(--text-primary)" }}>Need Help?</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            padding: 12,
            backgroundColor: "var(--bg-tertiary)",
            borderRadius: 8,
            borderLeft: "3px solid var(--info-color)",
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--info-color)", margin: "0 0 4px 0" }}>
            Documentation
          </p>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: 0 }}>
            Visit our comprehensive documentation
          </p>
        </div>
        <div
          style={{
            padding: 12,
            backgroundColor: "var(--bg-tertiary)",
            borderRadius: 8,
            borderLeft: "3px solid var(--success-color)",
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--success-color)", margin: "0 0 4px 0" }}>
            Support Tickets
          </p>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: 0 }}>
            3 open support tickets
          </p>
        </div>
        <a
          href="mailto:support@vardhanerp.com"
          style={{
            display: "inline-block",
            marginTop: 8,
            padding: "10px 16px",
            backgroundColor: "var(--accent-color)",
            color: "white",
            textDecoration: "none",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            textAlign: "center",
            transition: "background-color 0.2s ease",
          }}
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}

export default SupportCard;
