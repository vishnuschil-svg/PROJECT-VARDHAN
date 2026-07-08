import {
  ADMIN,
  CUSTOMER_OWNER,
  DEMO_CUSTOMER,
  PLATFORM_MODULES,
  PLATFORM_OWNER,
  STAFF,
  SUPER_ADMIN,
} from "./erpModules";

export const MANAGER = "MANAGER";

export const PERMISSION_GROUPS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "customer_management", label: "Customer Management" },
  { id: "organization", label: "Organization" },
  { id: "employees", label: "Employees" },
  { id: "roles_permissions", label: "Roles & Permissions" },
  { id: "license", label: "License" },
  { id: "reports", label: "Reports" },
  { id: "notifications", label: "Notifications" },
  { id: "settings", label: "Settings" },
  { id: "audit_logs", label: "Audit Logs" },
];

function fullPlatformPermissions() {
  return PLATFORM_MODULES.reduce((access, moduleId) => {
    access[moduleId] = true;
    return access;
  }, {});
}

export const DEFAULT_ROLES = [
  {
    id: PLATFORM_OWNER,
    name: "Platform Owner",
    scope: "platform",
    description: "Unrestricted access to every product, workspace and platform module.",
    locked: true,
    permissions: fullPlatformPermissions(),
  },
  {
    id: SUPER_ADMIN,
    name: "Super Admin",
    scope: "platform",
    description: "Platform-level administrator with complete operational access.",
    locked: true,
    permissions: fullPlatformPermissions(),
  },
  {
    id: CUSTOMER_OWNER,
    name: "Customer Owner",
    scope: "tenant",
    description: "Customer owner with access to purchased products and tenant administration.",
    locked: false,
    permissions: {
      dashboard: true,
      customer_management: false,
      organization: true,
      employees: true,
      roles_permissions: true,
      license: true,
      reports: true,
      notifications: true,
      settings: true,
      audit_logs: false,
    },
  },
  {
    id: ADMIN,
    name: "Admin",
    scope: "tenant",
    description: "Tenant administrator for organization and employee operations.",
    locked: false,
    permissions: {
      dashboard: true,
      customer_management: false,
      organization: true,
      employees: true,
      roles_permissions: false,
      license: false,
      reports: true,
      notifications: true,
      settings: true,
      audit_logs: false,
    },
  },
  {
    id: MANAGER,
    name: "Manager",
    scope: "tenant",
    description: "Branch or department manager with team and report access.",
    locked: false,
    permissions: {
      dashboard: true,
      customer_management: false,
      organization: true,
      employees: true,
      roles_permissions: false,
      license: false,
      reports: true,
      notifications: false,
      settings: false,
      audit_logs: false,
    },
  },
  {
    id: STAFF,
    name: "Staff",
    scope: "tenant",
    description: "Staff access is limited to explicitly assigned permissions.",
    locked: false,
    permissions: {
      dashboard: true,
      customer_management: false,
      organization: false,
      employees: false,
      roles_permissions: false,
      license: false,
      reports: false,
      notifications: false,
      settings: false,
      audit_logs: false,
    },
  },
  {
    id: DEMO_CUSTOMER,
    name: "Demo Customer",
    scope: "demo",
    description: "Demo-only access restricted to sandbox tenant data.",
    locked: true,
    permissions: {
      dashboard: true,
      customer_management: false,
      organization: false,
      employees: false,
      roles_permissions: false,
      license: false,
      reports: true,
      notifications: false,
      settings: false,
      audit_logs: false,
    },
  },
];

export const ROLE_SCOPE_VARIANTS = {
  platform: "success",
  tenant: "primary",
  demo: "warning",
};

export function getVisibleRoles(roles, canManagePlatformRoles) {
  if (canManagePlatformRoles) {
    return roles;
  }

  return roles.filter((role) => role.scope !== "platform");
}

export function canManageRole(role, canManagePlatformRoles) {
  if (canManagePlatformRoles) {
    return true;
  }

  return role.scope === "tenant";
}

export function countRolePermissions(role) {
  return Object.values(role.permissions || {}).filter(Boolean).length;
}

export function canRoleAccessRealData(role) {
  return role.scope !== "demo";
}
