import { BusinessHealthRepository } from "./BusinessHealthRepository.js";
import { getTenantScope } from "./chits/index.js";

const ACTIVITY_STORAGE_KEY = "vardhan.dashboard.activities.v1";

export const ActivityRepository = {
  getSnapshot(activeTenantContext) {
    return {
      ...BusinessHealthRepository.getSnapshot(activeTenantContext),
      customActivities: readActivities(activeTenantContext),
    };
  },

  addActivity(activity, activeTenantContext) {
    const scope = getTenantScope(activeTenantContext);

    if (!scope.scope_key || !canUseLocalStorage()) {
      return null;
    }

    const now = new Date().toISOString();
    const normalizedActivity = {
      ...activity,
      id: activity.id || `activity-${Date.now()}`,
      tenant_id: scope.tenant_id,
      data_scope: scope.data_scope,
      scope_key: scope.scope_key,
      time: activity.time || now,
      created_at: activity.created_at || now,
    };
    const next = [
      normalizedActivity,
      ...readAllActivities().filter(
        (item) => !(item.id === normalizedActivity.id && item.scope_key === normalizedActivity.scope_key)
      ),
    ].slice(0, 100);

    window.localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(next));
    return normalizedActivity;
  },
};

function readActivities(activeTenantContext) {
  const scope = getTenantScope(activeTenantContext);

  if (!scope.scope_key) {
    return [];
  }

  return readAllActivities()
    .filter((activity) => activity.scope_key === scope.scope_key)
    .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
}

function readAllActivities() {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ACTIVITY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}
