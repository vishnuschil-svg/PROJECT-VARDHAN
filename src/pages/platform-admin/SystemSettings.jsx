import { useState } from "react";
import AdminLayout from "../../components/platform-admin/AdminLayout";
import FormField from "../../components/common/FormField";
import Button from "../../components/common/Button";
import "./SystemSettings.css";

function SystemSettings() {
  const [settings, setSettings] = useState({
    appName: "VARDHAN ERP",
    logoUrl: "https://...",
    primaryColor: "#3b82f6",
    emailFrom: "noreply@vardhan.com",
    smtpServer: "smtp.mail.com",
    whatsappNumber: "+91 9876543210",
    smsProvider: "Twilio",
    storageLimit: "1000"
  });

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <AdminLayout 
      title="System Settings" 
      subtitle="Configure platform-wide settings"
    >
      <div className="settings-sections">
        <div className="settings-section">
          <h2>🎨 Branding</h2>
          <div className="settings-form">
            <FormField
              label="Application Name"
              value={settings.appName}
              onChange={(val) => handleChange("appName", val)}
            />
            <FormField
              label="Logo URL"
              value={settings.logoUrl}
              onChange={(val) => handleChange("logoUrl", val)}
            />
            <FormField
              label="Primary Color"
              type="text"
              value={settings.primaryColor}
              onChange={(val) => handleChange("primaryColor", val)}
            />
            <Button variant="primary" size="medium">Save Branding</Button>
          </div>
        </div>

        <div className="settings-section">
          <h2>📧 Email Configuration</h2>
          <div className="settings-form">
            <FormField
              label="From Email"
              type="email"
              value={settings.emailFrom}
              onChange={(val) => handleChange("emailFrom", val)}
            />
            <FormField
              label="SMTP Server"
              value={settings.smtpServer}
              onChange={(val) => handleChange("smtpServer", val)}
            />
            <Button variant="primary" size="medium">Test Email</Button>
          </div>
        </div>

        <div className="settings-section">
          <h2>💬 WhatsApp & SMS</h2>
          <div className="settings-form">
            <FormField
              label="WhatsApp Number"
              value={settings.whatsappNumber}
              onChange={(val) => handleChange("whatsappNumber", val)}
            />
            <FormField
              label="SMS Provider"
              type="select"
              value={settings.smsProvider}
              onChange={(val) => handleChange("smsProvider", val)}
              options={[
                { value: "Twilio", label: "Twilio" },
                { value: "AWS SNS", label: "AWS SNS" },
                { value: "Nexmo", label: "Nexmo" }
              ]}
            />
            <Button variant="primary" size="medium">Configure Credentials</Button>
          </div>
        </div>

        <div className="settings-section">
          <h2>💾 Storage</h2>
          <div className="settings-form">
            <FormField
              label="Storage Limit (GB)"
              type="number"
              value={settings.storageLimit}
              onChange={(val) => handleChange("storageLimit", val)}
            />
            <div className="storage-info">
              <p><strong>Used:</strong> 234 GB</p>
              <p><strong>Available:</strong> 766 GB</p>
              <div className="progress-bar" style={{ background: "var(--bg-tertiary)", borderRadius: 4, height: 8, marginTop: 8 }}>
                <div style={{ background: "var(--accent-color)", height: "100%", width: "23.4%", borderRadius: 4 }}></div>
              </div>
            </div>
            <Button variant="primary" size="medium">Save Settings</Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default SystemSettings;
