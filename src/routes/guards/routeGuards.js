import { DEV_AUTH_BYPASS } from "../../config/devAccess";
import { hasModuleAccess, isPlatformOwner } from "../../config/erpModules";
import { PermissionService } from "../../services/auth/PermissionService";

export const ROUTE_GUARD_RESULT = {
  ALLOW: "allow",
  LOGIN: "login",
  DASHBOARD: "dashboard",
  UPGRADE: "upgrade",
};

export function evaluatePublicRoute({ user, redirectAuthenticated = false } = {}) {
  if (redirectAuthenticated && user) {
    return { result: ROUTE_GUARD_RESULT.DASHBOARD, redirectTo: "/dashboard" };
  }

  return { result: ROUTE_GUARD_RESULT.ALLOW };
}

export function evaluateProtectedRoute({ user, profile, role, loading } = {}) {
  if (loading) {
    return { result: ROUTE_GUARD_RESULT.ALLOW, loading: true };
  }

  if (DEV_AUTH_BYPASS && user) {
    return { result: ROUTE_GUARD_RESULT.ALLOW };
  }

  if (!user) {
    return { result: ROUTE_GUARD_RESULT.LOGIN, redirectTo: "/login" };
  }

  if (profile?.status !== "approved") {
    return { result: ROUTE_GUARD_RESULT.LOGIN, redirectTo: "/login" };
  }

  if (!PermissionService.can({ action: "view", profile, role })) {
    return { result: ROUTE_GUARD_RESULT.LOGIN, redirectTo: "/login" };
  }

  return { result: ROUTE_GUARD_RESULT.ALLOW };
}

export function evaluateModuleRoute({ moduleId, modules, profile, role } = {}) {
  if (!moduleId || hasModuleAccess(moduleId, modules, profile, role)) {
    return { result: ROUTE_GUARD_RESULT.ALLOW };
  }

  return {
    result: ROUTE_GUARD_RESULT.UPGRADE,
    redirectTo: `/upgrade-subscription/${moduleId}`,
  };
}

export function evaluatePermissionRoute({ action, moduleId, permissions, profile, role, modules } = {}) {
  if (PermissionService.can({ action, moduleId, permissions, profile, role, modules })) {
    return { result: ROUTE_GUARD_RESULT.ALLOW };
  }

  return { result: ROUTE_GUARD_RESULT.DASHBOARD, redirectTo: "/dashboard" };
}

export function evaluatePlatformRoute({ platformOnly, profile, role } = {}) {
  if (!platformOnly || isPlatformOwner(profile, role)) {
    return { result: ROUTE_GUARD_RESULT.ALLOW };
  }

  return { result: ROUTE_GUARD_RESULT.DASHBOARD, redirectTo: "/dashboard" };
}
