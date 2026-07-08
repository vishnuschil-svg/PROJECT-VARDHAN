import { useNavigate } from "react-router-dom";
import ChitLayout from "../../components/chit/ChitLayout";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { CHIT_PRODUCT_NAME } from "../../config/erpModules";
import {
  CHIT_STATUS_VARIANTS,
  PHASE_ONE_CHIT_GROUPS,
  calculateChitDashboardStats,
  formatCurrency,
  getTenantChitGroups,
} from "../../config/chitPhaseOneData";
import { useAuth } from "../../hooks/useAuth";
import "./ChitDashboard.css";

function ChitDashboard() {
  const navigate = useNavigate();
  const { activeTenantContext } = useAuth();
  const tenantGroups = getTenantChitGroups(PHASE_ONE_CHIT_GROUPS, activeTenantContext);
  const stats = calculateChitDashboardStats(tenantGroups);

  const statCards = [
    { label: "Total Active Chits", value: stats.total_active_chits, tone: "primary" },
    { label: "Total Members", value: stats.total_members, tone: "info" },
    { label: "Today's Collections", value: formatCurrency(stats.todays_collections), tone: "success" },
    { label: "Pending Collections", value: formatCurrency(stats.pending_collections), tone: "warning" },
    { label: "Upcoming Auctions", value: stats.upcoming_auctions, tone: "primary" },
    { label: "Monthly Business", value: formatCurrency(stats.monthly_business), tone: "success" },
    { label: "Outstanding Amount", value: formatCurrency(stats.outstanding_amount), tone: "error" },
  ];

  return (
    <ChitLayout
      title="Chit Dashboard"
      subtitle={`${CHIT_PRODUCT_NAME} - ${activeTenantContext?.workspace_label || "Tenant"} workspace`}
      actions={
        <Button variant="primary" onClick={() => navigate("/chits/groups")}>
          Create Group
        </Button>
      }
    >
      <div className="chit-dashboard">
        <div className="chit-tenant-banner">
          <div>
            <span>{activeTenantContext?.workspace_label || "Workspace"}</span>
            <strong>{activeTenantContext?.tenant_id || "No active tenant"}</strong>
          </div>
          <Badge
            label={activeTenantContext?.data_scope || "no_scope"}
            variant={activeTenantContext?.data_scope === "demo_sandbox" ? "warning" : "success"}
            size="small"
          />
        </div>

        <div className="chit-stats-grid">
          {statCards.map((stat) => (
            <div key={stat.label} className={`chit-stat-card tone-${stat.tone}`}>
              <p className="stat-label">{stat.label}</p>
              <h3 className="stat-value">{stat.value}</h3>
            </div>
          ))}
        </div>

        <section className="chit-quick-section">
          <div className="section-heading-row">
            <div>
              <h2>Active Chit Groups</h2>
              <p>Phase 1 focuses on dashboard and chit group lifecycle.</p>
            </div>
          </div>

          <div className="chit-groups-list">
            {tenantGroups.length === 0 ? (
              <div className="empty-chit-state">
                No chit groups found for the active tenant workspace.
              </div>
            ) : (
              tenantGroups.slice(0, 4).map((group) => (
                <div key={group.id} className="chit-group-item">
                  <div className="group-info">
                    <h3>{group.chit_name}</h3>
                    <p>{group.chit_code}</p>
                    <div className="group-details">
                      <span className="detail">{formatCurrency(group.chit_value)}</span>
                      <span className="detail">{group.total_members} members</span>
                      <span className="detail">{group.total_months} months</span>
                      <span className="detail">{formatCurrency(group.monthly_amount)} monthly</span>
                    </div>
                  </div>
                  <div className="group-actions">
                    <Badge
                      label={group.status}
                      variant={CHIT_STATUS_VARIANTS[group.status] || "default"}
                      size="medium"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </ChitLayout>
  );
}

export default ChitDashboard;
