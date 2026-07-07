import { useState } from "react";
import ChitLayout from "../../components/chit/ChitLayout";
import Button from "../../components/common/Button";
import FormField from "../../components/common/FormField";
import "./Notifications.css";

function ChitNotifications() {
  const [settings, setSettings] = useState({
    whatsapp_enabled: true,
    whatsapp_number: "+91 9876543210",
    sms_enabled: true,
    sms_number: "+91 9876543210",
    email_enabled: true,
    email_address: "group@vardhan.com",
    notify_collection: true,
    notify_auction: true,
    notify_payout: true,
    notify_dividend: true,
  });

  return (
    <ChitLayout
      title="Notifications"
      subtitle="Configure WhatsApp, SMS, and Email notifications"
    >
      <div className="notif-sections">
        <div className="notif-section">
          <h2>💬 WhatsApp Configuration</h2>
          <div className="notif-form">
            <div className="toggle-item">
              <label>Enable WhatsApp Notifications</label>
              <input type="checkbox" checked={settings.whatsapp_enabled} onChange={(e) => setSettings({...settings, whatsapp_enabled: e.target.checked})} />
            </div>
            <FormField label="WhatsApp Number" value={settings.whatsapp_number} onChange={(val) => setSettings({...settings, whatsapp_number: val})} />
            <Button variant="primary" size="medium">Test Message</Button>
          </div>
        </div>

        <div className="notif-section">
          <h2>📱 SMS Configuration</h2>
          <div className="notif-form">
            <div className="toggle-item">
              <label>Enable SMS Notifications</label>
              <input type="checkbox" checked={settings.sms_enabled} onChange={(e) => setSettings({...settings, sms_enabled: e.target.checked})} />
            </div>
            <FormField label="SMS Number" value={settings.sms_number} onChange={(val) => setSettings({...settings, sms_number: val})} />
            <Button variant="primary" size="medium">Test SMS</Button>
          </div>
        </div>

        <div className="notif-section">
          <h2>📧 Email Configuration</h2>
          <div className="notif-form">
            <div className="toggle-item">
              <label>Enable Email Notifications</label>
              <input type="checkbox" checked={settings.email_enabled} onChange={(e) => setSettings({...settings, email_enabled: e.target.checked})} />
            </div>
            <FormField label="Email Address" value={settings.email_address} onChange={(val) => setSettings({...settings, email_address: val})} type="email" />
            <Button variant="primary" size="medium">Test Email</Button>
          </div>
        </div>

        <div className="notif-section">
          <h2>🔔 Notification Types</h2>
          <div className="notif-types">
            <div className="notif-type-item">
              <input type="checkbox" checked={settings.notify_collection} onChange={(e) => setSettings({...settings, notify_collection: e.target.checked})} />
              <label>Notify on Collection</label>
            </div>
            <div className="notif-type-item">
              <input type="checkbox" checked={settings.notify_auction} onChange={(e) => setSettings({...settings, notify_auction: e.target.checked})} />
              <label>Notify on Auction</label>
            </div>
            <div className="notif-type-item">
              <input type="checkbox" checked={settings.notify_payout} onChange={(e) => setSettings({...settings, notify_payout: e.target.checked})} />
              <label>Notify on Payout</label>
            </div>
            <div className="notif-type-item">
              <input type="checkbox" checked={settings.notify_dividend} onChange={(e) => setSettings({...settings, notify_dividend: e.target.checked})} />
              <label>Notify on Dividend</label>
            </div>
          </div>
          <Button variant="primary" size="medium" fullWidth>Save Settings</Button>
        </div>
      </div>
    </ChitLayout>
  );
}

export default ChitNotifications;
