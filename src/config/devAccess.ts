/**
 * Development authentication bypass configuration
 * Only applies when VITE_DEV_AUTH_BYPASS=true in .env
 * For local development only
 */

export const DEV_AUTH_BYPASS = import.meta.env.VITE_DEV_AUTH_BYPASS === "true";

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
    company_name: "VARDHAN SOFTWARE SOLUTIONS",
    status: "approved",
  },
  role: {
    name: "Platform Admin",
    permissions: ["all"],
  },
  modules: {
    chits: true,
    members: true,
    payments: true,
    reports: true,
    settings: true,
    support: true,
    dashboard: true,
  },
};
