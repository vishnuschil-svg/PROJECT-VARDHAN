import { PermissionEngine, SECURITY_ROLES, normalizeSecurityRole } from "./PermissionEngine";

export const RoleEngine = {
  resolveRole({ profile, role, workspace } = {}) {
    const rawRole =
      role?.key ||
      role?.code ||
      role?.id ||
      role?.name ||
      profile?.role ||
      profile?.role_name ||
      "";

    if (profile?.is_platform_admin || profile?.is_super_admin) {
      return SECURITY_ROLES.PLATFORM_OWNER;
    }

    if (workspace?.settings?.dataScope === "demo_sandbox") {
      return SECURITY_ROLES.DEMO_USER;
    }

    return normalizeSecurityRole(rawRole);
  },

  buildRoleProfile(context = {}) {
    const role = this.resolveRole(context);

    return {
      role,
      label: toRoleLabel(role),
      permissions: PermissionEngine.buildPermissionSet(role),
    };
  },
};

function toRoleLabel(role) {
  return String(role || "")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
