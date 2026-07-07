import { useState } from "react";
import AdminLayout from "../../components/platform-admin/AdminLayout";
import Badge from "../../components/common/Badge";
import "./ModuleManagement.css";

function ModuleManagement() {
  const [modules, setModules] = useState([
    { id: 1, name: "MITRA NIDHI CHITI PRO", icon: "🏦", status: true, users: 342, companies: 45 },
    { id: 2, name: "School ERP", icon: "🎓", status: true, users: 521, companies: 34 },
    { id: 3, name: "College ERP", icon: "🎒", status: true, users: 189, companies: 12 },
    { id: 4, name: "Finance ERP", icon: "💰", status: true, users: 654, companies: 67 },
    { id: 5, name: "Hospital ERP", icon: "🏥", status: true, users: 287, companies: 23 },
    { id: 6, name: "Apartment ERP", icon: "🏢", status: true, users: 423, companies: 41 },
    { id: 7, name: "Inventory ERP", icon: "📦", status: true, users: 356, companies: 38 },
    { id: 8, name: "HR & Payroll", icon: "👥", status: true, users: 478, companies: 52 },
    { id: 9, name: "CRM", icon: "👔", status: true, users: 234, companies: 28 }
  ]);

  const toggleModule = (id) => {
    setModules(modules.map(mod => 
      mod.id === id ? { ...mod, status: !mod.status } : mod
    ));
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
                  checked={module.status}
                  onChange={() => toggleModule(module.id)}
                />
                <span className="toggle-slider"></span>
              </label>
              <Badge
                label={module.status ? "Active" : "Disabled"}
                variant={module.status ? "success" : "warning"}
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
