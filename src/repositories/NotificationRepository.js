import { BusinessHealthRepository } from "./BusinessHealthRepository.js";
import { getTenantScope } from "./chits/index.js";

const READ_STORAGE_KEY = "vardhan.dashboard.notifications.read.v1";
const NOTIFICATION_STORAGE_KEY = "vardhan.dashboard.notifications.custom.v1";

export const NotificationRepository = {
  getSnapshot(activeTenantContext) {
    return {
      ...BusinessHealthRepository.getSnapshot(activeTenantContext),
      readIds: readNotificationIds(),
      customNotifications: readNotifications(activeTenantContext),
    };
  },

  markRead(notificationId) {
    const readIds = new Set(readNotificationIds());
    readIds.add(notificationId);
    writeNotificationIds(Array.from(readIds));
  },

  markAllRead(notificationIds = []) {
    const readIds = new Set(readNotificationIds());
    notificationIds.forEach((notificationId) => readIds.add(notificationId));
    writeNotificationIds(Array.from(readIds));
  },

  addNotification(notification, activeTenantContext) {
    const scope = getTenantScope(activeTenantContext);

    if (!scope.scope_key || !canUseLocalStorage()) {
      return null;
    }

    const now = new Date().toISOString();
    const normalizedNotification = {
      ...notification,
      id: notification.id || `notification-${Date.now()}`,
      tenant_id: scope.tenant_id,
      data_scope: scope.data_scope,
      scope_key: scope.scope_key,
      createdAt: notification.createdAt || now,
      isRead: Boolean(notification.isRead),
    };
    const next = [
      normalizedNotification,
      ...readAllNotifications().filter(
        (item) => !(item.id === normalizedNotification.id && item.scope_key === normalizedNotification.scope_key)
      ),
    ].slice(0, 100);

    window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(next));
    return normalizedNotification;
  },
};

function readNotifications(activeTenantContext) {
  const scope = getTenantScope(activeTenantContext);

  if (!scope.scope_key) {
    return [];
  }

  return readAllNotifications()
    .filter((notification) => notification.scope_key === scope.scope_key)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function readAllNotifications() {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readNotificationIds() {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(READ_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeNotificationIds(readIds) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(readIds));
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}
