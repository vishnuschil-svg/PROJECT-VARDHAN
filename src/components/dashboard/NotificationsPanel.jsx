function NotificationsPanel() {
  const notifications = [
    { icon: "💬", title: "New message", description: "From your account manager", time: "5 min ago", unread: true },
    { icon: "🎯", title: "Module update available", description: "Finance ERP v2.1.0", time: "1 hour ago", unread: true },
    { icon: "🔔", title: "System maintenance", description: "Scheduled for tomorrow at 2 AM", time: "3 hours ago", unread: false }
  ];

  return (
    <div className="card solid">
      <h3 style={{ marginTop: 0, marginBottom: 20, color: "var(--text-primary)" }}>Notifications</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {notifications.map((notif, idx) => (
          <div
            key={idx}
            style={{
              padding: 12,
              backgroundColor: notif.unread ? "var(--accent-light)" : "var(--bg-tertiary)",
              borderRadius: 8,
              borderLeft: notif.unread ? "3px solid var(--accent-color)" : "3px solid var(--border-color)",
              cursor: "pointer"
            }}
          >
            <div style={{ display: "flex", gap: 10 }}>
              <span style={{ fontSize: 16 }}>{notif.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px 0" }}>
                  {notif.title}
                </p>
                <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: "0 0 4px 0" }}>
                  {notif.description}
                </p>
                <p style={{ fontSize: 10, color: "var(--text-tertiary)", margin: 0 }}>
                  {notif.time}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NotificationsPanel;
