export const PLATFORM_NAME = "VARDHAN ERP PLATFORM";

export const ROLE_CONSTANTS = {
  PLATFORM_OWNER: "PLATFORM_OWNER",
  SUPER_ADMIN: "SUPER_ADMIN",
  CUSTOMER_OWNER: "CUSTOMER_OWNER",
  ADMIN: "ADMIN",
  STAFF: "STAFF",
  DEMO_CUSTOMER: "DEMO_CUSTOMER",
};

export const {
  PLATFORM_OWNER,
  SUPER_ADMIN,
  CUSTOMER_OWNER,
  ADMIN,
  STAFF,
  DEMO_CUSTOMER,
} = ROLE_CONSTANTS;

export const MODULE_CONSTANTS = {
  CHIT_MANAGEMENT_ERP: "chit_management",
  SCHOOL_ERP: "school",
  COLLEGE_ERP: "college",
  PRIVATE_HOSTELS_ERP: "private_hostels",
  INSURANCE_CRM: "insurance_crm",
};

export const {
  CHIT_MANAGEMENT_ERP,
  SCHOOL_ERP,
  COLLEGE_ERP,
  PRIVATE_HOSTELS_ERP,
  INSURANCE_CRM,
} = MODULE_CONSTANTS;

// Backward-compatible aliases for older seed data/imports.
export const FINANCE_ERP = INSURANCE_CRM;
export const HOSPITAL_ERP = PRIVATE_HOSTELS_ERP;
export const APARTMENT_ERP = PRIVATE_HOSTELS_ERP;

export const TENANT_TYPES = {
  PLATFORM_OWNER: "platform_owner",
  DEMO_CUSTOMER: "demo_customer",
  REAL_CUSTOMER: "real_customer",
  INTERNAL_CHIT_BUSINESS: "internal_chit_business",
};

export const CHIT_PRODUCT_NAME = "MITRA NIDHI CHITI PRO";

export const ERP_MODULES = [
  {
    id: MODULE_CONSTANTS.CHIT_MANAGEMENT_ERP,
    name: CHIT_PRODUCT_NAME,
    productName: CHIT_PRODUCT_NAME,
    shortName: "CHIT",
    description: "Flagship chit management product for groups, collections, auctions and receipts",
    status: "Active",
    path: "/chits",
    icon: "CHIT",
    dataScope: "tenant_chit_operations",
  },
  {
    id: MODULE_CONSTANTS.SCHOOL_ERP,
    name: "School ERP",
    shortName: "SCL",
    description: "Admissions, students, fees, staff and academic operations",
    status: "Coming Soon",
    path: "/products/school",
    icon: "SCL",
    dataScope: "tenant_school_operations",
  },
  {
    id: MODULE_CONSTANTS.COLLEGE_ERP,
    name: "College ERP",
    shortName: "CLG",
    description: "Higher education management platform",
    status: "Coming Soon",
    path: "/products/college",
    icon: "CLG",
    dataScope: "tenant_college_operations",
  },
  {
    id: MODULE_CONSTANTS.PRIVATE_HOSTELS_ERP,
    name: "Private Hostels ERP",
    shortName: "HSTL",
    description: "Hostel admissions, rooms, fees, mess and resident operations",
    status: "Coming Soon",
    path: "/products/private-hostels",
    icon: "HSTL",
    dataScope: "tenant_private_hostel_operations",
  },
  {
    id: MODULE_CONSTANTS.INSURANCE_CRM,
    name: "Insurance CRM",
    shortName: "CRM",
    description: "Insurance leads, customers, policies, renewals and follow-ups",
    status: "Coming Soon",
    path: "/products/insurance-crm",
    icon: "CRM",
    dataScope: "tenant_insurance_crm_operations",
  },
];

export const PLATFORM_MODULES = [
  "dashboard",
  "customer_management",
  "organization",
  "employees",
  "roles_permissions",
  "license",
  "reports",
  "notifications",
  "settings",
  "audit_logs",
];

export const MODULE_ACCESS_RULES = {
  platformOwner: {
    description: "Platform Owner / Super Admin can access every product and platform module.",
    moduleIds: ERP_MODULES.map((module) => module.id),
    platformModules: PLATFORM_MODULES,
  },
  customerOwner: {
    description: "Customer owners access only purchased products for their tenant.",
    moduleIds: [],
    platformModules: ["dashboard", "organization", "employees", "reports"],
  },
  staff: {
    description: "Staff access depends on assigned product and platform permissions.",
    moduleIds: [],
    platformModules: [],
  },
  demoCustomer: {
    description: "Demo customers access only assigned products inside demo sandbox data.",
    moduleIds: [],
    platformModules: ["dashboard", "reports"],
  },
  internalChitBusiness: {
    description: "VARDHAN-owned chit operations use real own-business tenant data inside MITRA NIDHI CHITI PRO.",
    moduleIds: [MODULE_CONSTANTS.CHIT_MANAGEMENT_ERP],
    platformModules: ["dashboard", "organization", "employees", "reports"],
  },
};

export const DEFAULT_MODULE_ACCESS = ERP_MODULES.reduce((access, module) => {
  access[module.id] = false;
  return access;
}, {});

export const PLATFORM_OWNER_MODULE_ACCESS = ERP_MODULES.reduce((access, module) => {
  access[module.id] = true;
  return access;
}, {});

export const INTERNAL_CHIT_BUSINESS_ACCESS = {
  ...DEFAULT_MODULE_ACCESS,
  [MODULE_CONSTANTS.CHIT_MANAGEMENT_ERP]: true,
};

export function normalizeRoleName(roleName = "") {
  return roleName.toString().trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

export function getRoleKey(role = null, profile = null) {
  return (
    role?.key ||
    role?.code ||
    role?.id ||
    role?.name ||
    profile?.role ||
    profile?.role_name ||
    ""
  );
}

export function isPlatformOwner(profile, role) {
  const normalizedRole = normalizeRoleName(getRoleKey(role, profile));

  return Boolean(
    profile?.is_platform_admin ||
      profile?.is_super_admin ||
      role?.permissions?.includes("all") ||
      normalizedRole === ROLE_CONSTANTS.PLATFORM_OWNER ||
      normalizedRole === ROLE_CONSTANTS.SUPER_ADMIN ||
      normalizedRole === "PLATFORM_OWNER_SUPER_ADMIN"
  );
}

export function hasModuleAccess(moduleId, modules = {}, profile = null, role = null) {
  if (isPlatformOwner(profile, role)) {
    return true;
  }

  return Boolean(modules?.[moduleId]);
}

export function getAccessibleModules(modules = {}, profile = null, role = null) {
  if (isPlatformOwner(profile, role)) {
    return ERP_MODULES;
  }

  return ERP_MODULES.filter((module) =>
    hasModuleAccess(module.id, modules, profile, role)
  );
}

export function hasPlatformModuleAccess(moduleId, permissions = {}, profile = null, role = null) {
  if (isPlatformOwner(profile, role)) {
    return true;
  }

  return Boolean(permissions?.[moduleId]);
}
