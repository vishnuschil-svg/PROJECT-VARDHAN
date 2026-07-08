import { useState } from "react";
import { FileText, Settings as SettingsIcon, Wallet } from "lucide-react";
import ChitLayout from "../../components/chit/ChitLayout";
import Button from "../../components/common/Button";
import FormField from "../../components/common/FormField";
import "./Settings.css";

function ChitSettings() {
  const [settings, setSettings] = useState({
    foreman_commission_percentage: 1,
    enable_running_chit: true,
    enable_auctions: true,
    enable_partial_payments: true,
    require_member_kyc: true,
    auto_generate_receipts: true,
    receipt_format: "detailed",
  });

  return (
    <ChitLayout
      title="Settings"
      subtitle="Configure module-wide settings"
    >
      <div className="settings-sections">
        <div className="settings-section">
          <h2><Wallet size={18} /> Financial Settings</h2>
          <div className="settings-form">
            <FormField
              label="Foreman Commission (%)"
              type="number"
              value={settings.foreman_commission_percentage}
              onChange={(val) => setSettings({ ...settings, foreman_commission_percentage: val })}
            />
          </div>
        </div>

        <div className="settings-section">
          <h2><SettingsIcon size={18} /> Feature Toggles</h2>
          <div className="feature-toggles">
            <div className="toggle-feature">
              <label>Enable Running Chit Migration</label>
              <input type="checkbox" checked={settings.enable_running_chit} onChange={(event) => setSettings({ ...settings, enable_running_chit: event.target.checked })} />
            </div>
            <div className="toggle-feature">
              <label>Enable Auctions</label>
              <input type="checkbox" checked={settings.enable_auctions} onChange={(event) => setSettings({ ...settings, enable_auctions: event.target.checked })} />
            </div>
            <div className="toggle-feature">
              <label>Allow Partial Payments</label>
              <input type="checkbox" checked={settings.enable_partial_payments} onChange={(event) => setSettings({ ...settings, enable_partial_payments: event.target.checked })} />
            </div>
            <div className="toggle-feature">
              <label>Require Member KYC</label>
              <input type="checkbox" checked={settings.require_member_kyc} onChange={(event) => setSettings({ ...settings, require_member_kyc: event.target.checked })} />
            </div>
            <div className="toggle-feature">
              <label>Auto-Generate Receipts</label>
              <input type="checkbox" checked={settings.auto_generate_receipts} onChange={(event) => setSettings({ ...settings, auto_generate_receipts: event.target.checked })} />
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2><FileText size={18} /> Receipt Settings</h2>
          <div className="settings-form">
            <FormField
              label="Receipt Format"
              type="select"
              value={settings.receipt_format}
              onChange={(val) => setSettings({ ...settings, receipt_format: val })}
              options={[
                { value: "detailed", label: "Detailed" },
                { value: "simple", label: "Simple" },
              ]}
            />
          </div>
        </div>

        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12 }}>
          <Button variant="primary" size="medium">Save Settings</Button>
          <Button variant="ghost" size="medium">Reset to Default</Button>
        </div>
      </div>
    </ChitLayout>
  );
}

export default ChitSettings;
