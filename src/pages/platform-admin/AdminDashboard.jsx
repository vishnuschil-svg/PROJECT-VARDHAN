import AdminLayout from "../../components/platform-admin/AdminLayout";
import Button from "../../components/common/Button";
import "./AdminDashboard.css";

function AdminDashboard() {
  const stats = [
    { label: "Total Companies", value: "328", change: "+12%", icon: "🏢" },
    { label: "Active Users", value: "2,451", change: "+8%", icon: "👥" },
    { label: "Active Licenses", value: "1,823", change: "+5%", icon: "📜" },
    { label: "Support Tickets", value: "45", change: "-3%", icon: "🆘" },
    { label: "Monthly Revenue", value: "$125.4K", change: "+18%", icon: "💰" },
    { label: "System Uptime", value: "99.98%", change: "↑", icon: "⚡" }
  ];

  return (
    <AdminLayout title="Platform Admin Dashboard">
      <div className="admin-stats-grid">
        {stats.map((stat, idx) => (
          <div key={idx} className="admin-stat-card">
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-content">
              <p className="stat-label">{stat.label}</p>
              <p className="stat-value">{stat.value}</p>
              <p className="stat-change positive">{stat.change}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-sections">
        <div className="admin-section">
          <h2>Quick Actions</h2>
          <div className="quick-actions">
            <Button variant="primary" icon="➕">Create Company</Button>
            <Button variant="primary" icon="👤">Add User</Button>
            <Button variant="primary" icon="📋">View Audit Logs</Button>
            <Button variant="primary" icon="⚙️">System Settings</Button>
          </div>
        </div>

        <div className="admin-section">
          <h2>Recent Activities</h2>
          <div className="activity-feed">
            {[
              { action: "New Company Registration", company: "Tech Solutions Pvt Ltd", time: "2 hours ago", icon: "📝" },
              { action: "License Activated", company: "Finance Innovations", time: "4 hours ago", icon: "✅" },
              { action: "Support Ticket Closed", company: "Global Enterprises", time: "6 hours ago", icon: "🆘" },
              { action: "User Suspended", company: "StartUp Labs", time: "1 day ago", icon: "🚫" }
            ].map((item, idx) => (
              <div key={idx} className="activity-item">
                <span className="activity-icon">{item.icon}</span>
                <div className="activity-details">
                  <p className="activity-action">{item.action}</p>
                  <p className="activity-company">{item.company}</p>
                </div>
                <p className="activity-time">{item.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminDashboard;
