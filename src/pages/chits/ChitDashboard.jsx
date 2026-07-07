import ChitLayout from "../../components/chit/ChitLayout";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { mockChitGroups, mockChitDashboardStats } from "../../config/chitMockData";
import "./ChitDashboard.css";

function ChitDashboard() {
  const stats = mockChitDashboardStats;

  const statCards = [
    { label: "Active Chit Groups", value: stats.active_groups, icon: "👥", color: "primary" },
    { label: "Total Members", value: stats.total_members, icon: "👤", color: "info" },
    { label: "Total Value Managed", value: `₹${(stats.total_value_managed / 100000).toFixed(1)}L`, icon: "💰", color: "success" },
    { label: "Monthly Collections", value: `₹${(stats.monthly_collections / 1000).toFixed(0)}K`, icon: "📊", color: "warning" },
    { label: "Pending Collections", value: `₹${(stats.pending_collections / 1000).toFixed(0)}K`, icon: "⏳", color: "error" },
    { label: "Payouts Processed", value: `₹${(stats.total_payouts_processed / 1000).toFixed(0)}K`, icon: "💳", color: "primary" },
  ];

  return (
    <ChitLayout
      title="Chit Dashboard"
      subtitle="Overview of all chit groups and activities"
      actions={<Button variant="primary" icon="➕">New Chit Group</Button>}
    >
      <div className="chit-dashboard">
        {/* Stats Grid */}
        <div className="chit-stats-grid">
          {statCards.map((stat, idx) => (
            <div key={idx} className="chit-stat-card">
              <div className="stat-icon">{stat.icon}</div>
              <div className="stat-content">
                <p className="stat-label">{stat.label}</p>
                <h3 className="stat-value">{stat.value}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="chit-quick-section">
          <h2>⚡ Quick Actions</h2>
          <div className="chit-quick-actions">
            <Button variant="primary" icon="➕" fullWidth>Create New Chit Group</Button>
            <Button variant="default" icon="👤" fullWidth>Add New Member</Button>
            <Button variant="default" icon="💰" fullWidth>Record Collection</Button>
            <Button variant="default" icon="🎯" fullWidth>Create Auction</Button>
            <Button variant="default" icon="📄" fullWidth>Generate Receipt</Button>
            <Button variant="default" icon="📋" fullWidth>View Reports</Button>
          </div>
        </div>

        {/* Recent Chit Groups */}
        <div className="chit-quick-section">
          <h2>📋 Active Chit Groups</h2>
          <div className="chit-groups-list">
            {mockChitGroups.filter(g => g.status === "active").map((group) => (
              <div key={group.id} className="chit-group-item">
                <div className="group-info">
                  <h3>{group.group_name}</h3>
                  <p>{group.description}</p>
                  <div className="group-details">
                    <span className="detail">🏷️ ₹{group.chit_value.toLocaleString()}</span>
                    <span className="detail">👥 {group.member_count} members</span>
                    <span className="detail">📅 {group.duration_months} months</span>
                    <span className="detail">💵 ₹{group.monthly_installment.toLocaleString()}/month</span>
                  </div>
                </div>
                <div className="group-actions">
                  <Badge label="Active" variant="success" size="medium" />
                  <Button variant="default" size="small" icon="👁️">View</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ChitLayout>
  );
}

export default ChitDashboard;
