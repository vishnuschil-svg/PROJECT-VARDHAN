import { useState } from "react";
import AdminLayout from "../../components/platform-admin/AdminLayout";
import Badge from "../../components/common/Badge";
import { ERP_MODULES } from "../../config/erpModules";
import "./ModuleManagement.css";

const MODULE_USAGE = {
  chit_management: { users: 342, companies: 45 },
  school: { users: 521, companies: 34 },
  college: { users: 189, companies: 12 },
  private_hostels: { users: 287, companies: 23 },
  insurance_crm: { users: 654, companies: 67 },
};

function ModuleManagement() {
  const [modules, setModules] = useState(
    ERP_MODULES.map((module) => ({
      ...module,
      enabled: module.status === "Active",
      users: MODULE_USAGE[module.id]?.users || 0,
      companies: MODULE_USAGE[module.id]?.companies || 0,
    }))
  );

  const toggleModule = (id) => {
    setModules(
      modules.map((module) =>
        module.id === id ? { ...module, enabled: !module.enabled } : module
      )
    );
  };

  return (
    <AdminLayout
      title="Module Management"
      subtitle="Enable or disable ERP modules for the platform"
    >
      <div className="modules-grid">
        {modules.map((module) => (
          <div key={module.id} className="module-management-card">
            <div className="module-header-section">
              <span className="module-icon-large">{module.icon}</span>
              <h3>{module.name}</h3>
            </div>

            <div className="module-stats">
              <div className="stat-item">
                <span className="stat-label">Active Users</span>
                <span className="stat-number">{module.users}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Companies</span>
                <span className="stat-number">{module.companies}</span>
              </div>
            </div>

            <div className="module-control">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={module.enabled}
                  onChange={() => toggleModule(module.id)}
                />
                <span className="toggle-slider"></span>
              </label>
              <Badge
                label={module.enabled ? "Active" : "Disabled"}
                variant={module.enabled ? "success" : "warning"}
                size="small"
              />
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}

export default ModuleManagement;
