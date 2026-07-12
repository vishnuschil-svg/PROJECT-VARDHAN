import AdminLayout from "../../components/platform-admin/AdminLayout";
import Button from "../../components/common/Button";
import "./NotificationsPage.css";

function Notifications() {
  const notifications = [
    { id: 1, type: "system", icon: "⚠️", title: "System Maintenance", message: "Scheduled maintenance on 2024-06-20 from 02:00 to 04:00 UTC", time: "2 hours ago" },
    { id: 2, type: "alert", icon: "🚨", title: "High Load Alert", message: "Server CPU usage at 85%. Consider scaling up.", time: "4 hours ago" },
    { id: 3, type: "info", icon: "ℹ️", title: "New Company Registered", message: "Global Enterprises Ltd has registered", time: "1 day ago" }
  ];

  return (
    <AdminLayout 
      title="Notifications" 
      subtitle="System and platform notifications"
      actions={<Button variant="primary" icon="🔔">Send Notification</Button>}
    >
      <div className="notifications-list">
        {notifications.map((notif) => (
          <div key={notif.id} className={`notification-item notification-${notif.type}`}>
            <div className="notification-icon">{notif.icon}</div>
            <div className="notification-content">
              <h3>{notif.title}</h3>
              <p>{notif.message}</p>
              <span className="notification-time">{notif.time}</span>
            </div>
            <div className="notification-actions">
              <Button variant="ghost" size="small">Mark as read</Button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}

export default Notifications;
