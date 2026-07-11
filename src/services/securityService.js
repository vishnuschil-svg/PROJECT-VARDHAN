import { AuditLogger } from "../security/AuditLogger";
import { PermissionEngine, SECURITY_PERMISSIONS } from "../security/PermissionEngine";
import { RoleEngine } from "../security/RoleEngine";
import { SecurityMiddleware } from "../security/SecurityMiddleware";
import { SessionManager } from "../security/SessionManager";
import { SecurityRepository } from "../repositories/SecurityRepository";
import { getLicenseDashboardSummary, getLicenseState } from "./licenseService";

export function buildSecurityContext({ user, profile, role, permissions, modules, workspace } = {}) {
  const snapshot = SecurityRepository.getSecuritySnapshot({
    user,
    profile,
    role,
    permissions,
    modules,
    workspace,
  });
  const roleProfile = RoleEngine.buildRoleProfile(snapshot);
  const license = getLicenseState({
    workspace: snapshot.workspace,
    permissionSet: roleProfile.permissions,
  });
  const session = SessionManager.createSessionState({
    user: snapshot.user,
    workspace: snapshot.workspace,
  });

  return {
    ...snapshot,
    roleProfile,
    license,
    session,
  };
}

export function getSecurityLicenseDashboardModel(context = {}) {
  const securityContext = buildSecurityContext(context);
  const licenseSummary = getLicenseDashboardSummary({
    workspace: securityContext.workspace,
    permissionSet: securityContext.roleProfile.permissions,
  });
  const workspacePermissions = buildWorkspacePermissions(securityContext.roleProfile.permissions);

  return {
    license: licenseSummary,
    role: securityContext.roleProfile.label,
    session: {
      expiresIn: `${SessionManager.getMinutesRemaining(securityContext.session)} minutes`,
      mfaStatus: securityContext.session.mfa.status,
      deviceStatus: securityContext.session.device.status,
    },
    workspacePermissions,
    audit: {
      recentCount: securityContext.auditLogs.length,
      actionCount: securityContext.actions.length,
    },
  };
}

export function canUseFeature(permission, context = {}) {
  const securityContext = buildSecurityContext(context);
  return SecurityMiddleware.authorize({ permission, securityContext });
}

export function trackSecurityAction({ action, actor, workspace, module, metadata } = {}) {
  const entry = AuditLogger.createEntry({ action, actor, workspace, module, metadata });
  SecurityRepository.writeAuditLog(entry);
  SecurityRepository.trackAction(entry);
  return entry;
}

function buildWorkspacePermissions(permissionSet) {
  return Object.values(SECURITY_PERMISSIONS).map((permission) => ({
    key: permission,
    label: permission,
    allowed: PermissionEngine.canAccess(permission, permissionSet),
  }));
}
