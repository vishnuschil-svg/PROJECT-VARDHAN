import {
  PLATFORM_OWNER,
  PLATFORM_OWNER_MODULE_ACCESS,
  TENANT_TYPES,
} from "./erpModules.js";

/**
 * Development authentication bypass configuration
 * Only applies when VITE_DEV_AUTH_BYPASS=true in .env
 * For local development only
 */

export const DEV_AUTH_BYPASS = (import.meta.env || {}).VITE_DEV_AUTH_BYPASS === "true";

/**
 * Mock data for development bypass
 */
export const DEV_MOCK_DATA = {
  user: {
    id: "dev-user",
    email: "dev@vardhanerp.com",
    user_metadata: {
      full_name: "Vishnu Vardhan Reddy",
    },
  },
  profile: {
    id: "dev-user",
    full_name: "Vishnu Vardhan Reddy",
    is_platform_admin: true,
    status: "approved",
  },
  company: {
    id: "dev-company",
    customer_id: "tenant-own-chit",
    tenant_id: "own-chit-business",
    company_name: "VARDHAN SOFTWARE SOLUTIONS",
    tenant_type: TENANT_TYPES.INTERNAL_CHIT_BUSINESS,
    data_scope: "own_business",
    status: "approved",
  },
  role: {
    id: PLATFORM_OWNER,
    name: "Platform Owner / Super Admin",
    permissions: ["all"],
  },
  modules: PLATFORM_OWNER_MODULE_ACCESS,
};
