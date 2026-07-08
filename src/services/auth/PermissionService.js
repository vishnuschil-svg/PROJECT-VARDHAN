import {
  ADMIN,
  CUSTOMER_OWNER,
  DEMO_CUSTOMER,
  PLATFORM_OWNER,
  STAFF,
  SUPER_ADMIN,
  hasModuleAccess,
  isPlatformOwner,
  normalizeRoleName,
} from "../../config/erpModules";
import { MANAGER } from "../../config/roleAccess";

export const AUTH_ROLES = {
  PLATFORM_OWNER,
  SUPER_ADMIN,
  CUSTOMER_OWNER,
  ADMIN,
  STAFF,
  ACCOUNTANT: "ACCOUNTANT",
  MANAGER,
  DEMO_CUSTOMER,
};

export const AUTH_ACTIONS = {
  VIEW: "view",
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  APPROVE: "approve",
  EXPORT: "export",
  PRINT: "print",
  WHATSAPP: "whatsapp",
  REPORTS: "reports",
  SETTINGS: "settings",
};

const ALL_ACTIONS = Object.values(AUTH_ACTIONS);

const ROLE_ACTIONS = {
  [PLATFORM_OWNER]: ALL_ACTIONS,
  [SUPER_ADMIN]: ALL_ACTIONS,
  [CUSTOMER_OWNER]: ALL_ACTIONS,
  [ADMIN]: [
    AUTH_ACTIONS.VIEW,
    AUTH_ACTIONS.CREATE,
    AUTH_ACTIONS.UPDATE,
    AUTH_ACTIONS.APPROVE,
    AUTH_ACTIONS.EXPORT,
    AUTH_ACTIONS.PRINT,
    AUTH_ACTIONS.WHATSAPP,
    AUTH_ACTIONS.REPORTS,
    AUTH_ACTIONS.SETTINGS,
  ],
  [MANAGER]: [
    AUTH_ACTIONS.VIEW,
    AUTH_ACTIONS.CREATE,
    AUTH_ACTIONS.UPDATE,
    AUTH_ACTIONS.APPROVE,
    AUTH_ACTIONS.EXPORT,
    AUTH_ACTIONS.PRINT,
    AUTH_ACTIONS.WHATSAPP,
    AUTH_ACTIONS.REPORTS,
  ],
  ACCOUNTANT: [
    AUTH_ACTIONS.VIEW,
    AUTH_ACTIONS.CREATE,
    AUTH_ACTIONS.UPDATE,
    AUTH_ACTIONS.EXPORT,
    AUTH_ACTIONS.PRINT,
    AUTH_ACTIONS.WHATSAPP,
    AUTH_ACTIONS.REPORTS,
  ],
  [STAFF]: [
    AUTH_ACTIONS.VIEW,
    AUTH_ACTIONS.CREATE,
    AUTH_ACTIONS.PRINT,
    AUTH_ACTIONS.WHATSAPP,
  ],
  [DEMO_CUSTOMER]: [
    AUTH_ACTIONS.VIEW,
    AUTH_ACTIONS.EXPORT,
    AUTH_ACTIONS.PRINT,
    AUTH_ACTIONS.REPORTS,
  ],
};

export const PermissionService = {
  getRoleKey({ profile, role } = {}) {
    return normalizeRoleName(
      role?.key ||
        role?.code ||
        role?.id ||
        role?.name ||
        profile?.role ||
        profile?.role_name ||
        ""
    );
  },

  buildPermissions({ profile, role, modules, activeWorkspace } = {}) {
    const roleKey = this.resolveRoleKey({ profile, role, activeWorkspace });
    const actions = ROLE_ACTIONS[roleKey] || ROLE_ACTIONS[STAFF];
    const actionPermissions = ALL_ACTIONS.reduce((access, action) => {
      access[action] = actions.includes(action);
      return access;
    }, {});

    return {
      role: roleKey,
      isPlatformOwner: isPlatformOwner(profile, role),
      actions: actionPermissions,
      modules: modules || {},
      workspace: {
        id: activeWorkspace?.id || null,
        tenant_id: activeWorkspace?.tenant_id || activeWorkspace?.tenantId || null,
        data_scope: activeWorkspace?.data_scope || activeWorkspace?.dataScope || null,
      },
    };
  },

  resolveRoleKey({ profile, role, activeWorkspace } = {}) {
    const roleKey = this.getRoleKey({ profile, role });

    if (isPlatformOwner(profile, role)) {
      return roleKey === SUPER_ADMIN ? SUPER_ADMIN : PLATFORM_OWNER;
    }

    if (roleKey) {
      return roleKey;
    }

    if ((activeWorkspace?.data_scope || activeWorkspace?.dataScope) === "demo_sandbox") {
      return DEMO_CUSTOMER;
    }

    return STAFF;
  },

  can({ action, moduleId, permissions, profile, role, modules } = {}) {
    if (isPlatformOwner(profile, role) || permissions?.isPlatformOwner) {
      return true;
    }

    const normalizedAction = String(action || "").toLowerCase();
    const actionAllowed = normalizedAction
      ? Boolean(permissions?.actions?.[normalizedAction])
      : true;
    const moduleAllowed = moduleId
      ? hasModuleAccess(moduleId, modules || permissions?.modules, profile, role)
      : true;

    return actionAllowed && moduleAllowed;
  },
};
