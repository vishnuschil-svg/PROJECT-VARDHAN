import AdminLayout from "../../components/platform-admin/AdminLayout";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import "./BackupRestore.css";

function BackupRestore() {
  const backups = [
    { id: 1, name: "Daily Backup", date: "2024-06-15 02:00", size: "2.4 GB", status: "completed", type: "automatic" },
    { id: 2, name: "Weekly Backup", date: "2024-06-14 20:00", size: "2.3 GB", status: "completed", type: "automatic" },
    { id: 3, name: "Manual Backup", date: "2024-06-13 15:30", size: "2.2 GB", status: "completed", type: "manual" }
  ];

  return (
    <AdminLayout 
      title="Backup & Restore" 
      subtitle="Manage system backups and restoration"
      actions={<Button variant="primary" icon="💾">Create Backup Now</Button>}
    >
      <div className="backup-sections">
        <div className="backup-section">
          <h2>System Backups</h2>
          <div className="backups-list">
            {backups.map((backup) => (
              <div key={backup.id} className="backup-item">
                <div className="backup-info">
                  <div className="backup-header">
                    <h3>{backup.name}</h3>
                    <Badge
                      label={backup.type === "automatic" ? "Auto" : "Manual"}
                      variant={backup.type === "automatic" ? "info" : "primary"}
                      size="small"
                    />
                  </div>
                  <p className="backup-meta">{backup.date} • Size: {backup.size}</p>
                </div>
                <div className="backup-actions">
                  <Button variant="default" size="small" icon="📥">Download</Button>
                  <Button variant="primary" size="small" icon="🔄">Restore</Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="backup-section">
          <h2>Backup Settings</h2>
          <div className="settings-list">
            <div className="setting-item">
              <div className="setting-label">
                <span>Daily Backup</span>
                <p>Automatic backup every day at 02:00 UTC</p>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="setting-label">
                <span>Weekly Full Backup</span>
                <p>Complete database backup every Sunday</p>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="setting-label">
                <span>Cloud Backup</span>
                <p>Store backups in cloud storage</p>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default BackupRestore;
