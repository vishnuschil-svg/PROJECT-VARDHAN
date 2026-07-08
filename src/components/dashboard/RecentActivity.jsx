function RecentActivity() {
  const activities = [
    { icon: "REG", title: "New user registration", description: "John Doe registered a new account", time: "2 hours ago" },
    { icon: "LIC", title: "License purchased", description: "Insurance CRM license activated", time: "4 hours ago" },
    { icon: "SYS", title: "System update", description: "Platform updated to v3.2.1", time: "6 hours ago" },
    { icon: "SUB", title: "Subscription renewed", description: "Enterprise plan renewed for Q4", time: "1 day ago" },
    { icon: "SUP", title: "Support ticket created", description: "Technical issue reported by client", time: "1 day ago" },
  ];

  return (
    <div className="card solid">
      <h3 style={{ marginTop: 0, marginBottom: 20, color: "var(--text-primary)" }}>
        Recent Activity
      </h3>
      <div className="activity-list">
        {activities.map((activity, idx) => (
          <div key={idx} className="activity-item">
            <div className="activity-icon">{activity.icon}</div>
            <div className="activity-content">
              <p className="activity-title">{activity.title}</p>
              <p className="activity-description">{activity.description}</p>
              <p className="activity-time">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecentActivity;
