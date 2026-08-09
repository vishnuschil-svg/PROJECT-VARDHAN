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
} from "../../config/erpModules.js";
import { MANAGER } from "../../config/roleAccess.js";
import { GROUP_MANAGER_PERMISSIONS, REGISTERED_OPERATION_PERMISSIONS } from "../../config/groupManagerSafety.js";

export const RESERVED_FEATURE_PERMISSIONS = REGISTERED_OPERATION_PERMISSIONS;

const GROUP_MANAGER_WRITE_ROLES = new Set([PLATFORM_OWNER, SUPER_ADMIN, CUSTOMER_OWNER, ADMIN]);
const GROUP_MANAGER_FEATURES = new Set(Object.values(GROUP_MANAGER_PERMISSIONS));

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
      (typeof role === "string" ? role : "") ||
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
      features: Object.values(REGISTERED_OPERATION_PERMISSIONS).reduce((featureAccess, permission) => {
        featureAccess[permission] = isPlatformOwner(profile, role);
        return featureAccess;
      }, Object.values(GROUP_MANAGER_PERMISSIONS).reduce((featureAccess, permission) => {
        featureAccess[permission] = GROUP_MANAGER_WRITE_ROLES.has(roleKey);
        return featureAccess;
      }, {})),
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

    const requestedAction = String(action || "");
    const normalizedAction = requestedAction.toLowerCase();
    const roleKey = this.getRoleKey({ profile, role });
    const isGroupManagerFeature = GROUP_MANAGER_FEATURES.has(requestedAction);
    const explicitFeature = permissions?.features?.[requestedAction] ?? permissions?.[requestedAction];
    const actionAllowed = isGroupManagerFeature
      ? (typeof explicitFeature === "boolean" ? explicitFeature : GROUP_MANAGER_WRITE_ROLES.has(roleKey))
      : normalizedAction
        ? Boolean(permissions?.actions?.[normalizedAction])
        : true;
    const moduleAllowed = moduleId
      ? hasModuleAccess(moduleId, modules || permissions?.modules, profile, role)
      : true;

    return actionAllowed && moduleAllowed;
  },
};
