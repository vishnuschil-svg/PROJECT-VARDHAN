import {
  AlertCircle,
  ArrowRight,
  Bell,
  CheckCheck,
  CircleDollarSign,
  Gift,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  X,
} from "lucide-react";
import { NOTIFICATION_TYPES } from "../../services/notificationService";

const NOTIFICATION_ICONS = {
  [NOTIFICATION_TYPES.PAYMENT_RECEIVED]: CircleDollarSign,
  [NOTIFICATION_TYPES.PAYMENT_PENDING]: AlertCircle,
  [NOTIFICATION_TYPES.AUCTION_TODAY]: Trophy,
  [NOTIFICATION_TYPES.LUCKY_DRAW]: Gift,
  [NOTIFICATION_TYPES.MEMBER_ADDED]: UserRound,
  [NOTIFICATION_TYPES.MEMBER_UPDATED]: UserRound,
  [NOTIFICATION_TYPES.RECEIPT_GENERATED]: ReceiptText,
  [NOTIFICATION_TYPES.SYSTEM_ALERT]: ShieldCheck,
  [NOTIFICATION_TYPES.BACKUP_COMPLETED]: CheckCheck,
  [NOTIFICATION_TYPES.AI_RECOMMENDATION]: Sparkles,
};

function NotificationCenter({
  isOpen,
  notifications,
  unreadCount,
  onClose,
  onMarkAllRead,
  onNotificationAction,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <aside className="royal-notification-center" aria-label="Enterprise notification center">
      <div className="royal-notification-header">
        <div>
          <span className="royal-dashboard-eyebrow">Notification Center</span>
          <h3>Enterprise alerts</h3>
        </div>
        <button type="button" onClick={onClose} aria-label="Close notification center">
          <X size={18} />
        </button>
      </div>

      <div className="royal-notification-summary">
        <div>
          <Bell size={18} />
          <span>{unreadCount} unread</span>
        </div>
        <button type="button" onClick={onMarkAllRead}>
          <CheckCheck size={16} />
          Mark all read
        </button>
      </div>

      <div className="royal-notification-list">
        {notifications.map((notification) => {
          const Icon = NOTIFICATION_ICONS[notification.type] || Bell;

          return (
            <article
              className={`royal-notification-item royal-notification-${notification.priority} ${notification.isRead ? "is-read" : ""}`}
              key={notification.id}
            >
              <div className="royal-notification-icon" aria-hidden="true">
                <Icon size={18} />
              </div>
              <div className="royal-notification-body">
                <div className="royal-notification-title-row">
                  <h4>{notification.title}</h4>
                  <span>{notification.priority}</span>
                </div>
                <p>{notification.message}</p>
                <time dateTime={notification.createdAt}>{notification.createdAt}</time>
                <button
                  type="button"
                  onClick={() => onNotificationAction(notification)}
                >
                  Open
                  <ArrowRight size={15} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </aside>
  );
}

export default NotificationCenter;
