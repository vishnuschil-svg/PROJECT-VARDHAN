import { DEV_AUTH_BYPASS, DEV_MOCK_DATA } from "../../config/devAccess";

export const AuthService = {
  async login({ email, password } = {}) {
    if (DEV_AUTH_BYPASS) {
      return this.getDevelopmentSession();
    }

    throw new Error(
      `Auth provider is not configured yet for ${email || "this user"}. Supabase Auth will be connected in a later batch.`
    );
  },

  async logout() {
    return { user: null, profile: null, company: null, role: null, modules: null };
  },

  async refreshSession() {
    if (DEV_AUTH_BYPASS) {
      return this.getDevelopmentSession();
    }

    return { user: null, profile: null, company: null, role: null, modules: null };
  },

  getDevelopmentSession() {
    return {
      user: DEV_MOCK_DATA.user,
      profile: DEV_MOCK_DATA.profile,
      company: DEV_MOCK_DATA.company,
      role: DEV_MOCK_DATA.role,
      modules: DEV_MOCK_DATA.modules,
    };
  },

  validateSession(session) {
    return Boolean(session?.user);
  },
};
