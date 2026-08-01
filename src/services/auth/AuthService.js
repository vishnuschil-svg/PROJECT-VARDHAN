import { DEV_AUTH_BYPASS, DEV_MOCK_DATA } from "../../config/devAccess.ts";
import { PLATFORM_OWNER } from "../../config/erpModules.js";

const DEMO_AUTH_STORAGE_KEY = "vardhan.demo.auth.session.v1";
const LEGACY_DEMO_SESSION_STORAGE_KEY = DEMO_AUTH_STORAGE_KEY;
const DEMO_CREDENTIALS = {
  email: "admin@vardhan.com",
  password: "admin123",
};
const DEMO_TENANT_CONTEXT = {
  tenant_id: "platform-owner",
  data_scope: "platform_owner",
};

export const AuthService = {
  async login({ email, password } = {}) {
    if (this.isDemoLogin(email, password)) {
      const session = this.getDemoSession();
      this.persistDemoSession(session);
      return session;
    }

    if (DEV_AUTH_BYPASS || isDemoAuthEnabled()) {
      const session = this.getDevelopmentSession();

      if (DEV_AUTH_BYPASS && !email && !password) {
        this.persistDemoSession(session);
        return session;
      }

      throw new Error("Wrong demo credentials. Use admin@vardhan.com / admin123.");
    }

    throw new Error("Wrong demo credentials. Use admin@vardhan.com / admin123.");
  },

  async logout() {
    this.clearPersistedDemoSession();
    return { user: null, profile: null, company: null, role: null, modules: null };
  },

  async refreshSession() {
    if (DEV_AUTH_BYPASS) {
      return this.getDevelopmentSession();
    }

    const persistedDemoSession = this.getPersistedDemoSession();
    if (persistedDemoSession) {
      return persistedDemoSession;
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

  getDemoSession() {
    return {
      ...this.getDevelopmentSession(),
      user: {
        ...DEV_MOCK_DATA.user,
        id: "demo-platform-owner",
        email: DEMO_CREDENTIALS.email,
        user_metadata: {
          full_name: "VARDHAN Demo Admin",
        },
      },
      profile: {
        ...DEV_MOCK_DATA.profile,
        id: "demo-platform-owner",
        full_name: "VARDHAN Demo Admin",
        email: DEMO_CREDENTIALS.email,
        is_platform_admin: true,
        status: "approved",
      },
      company: {
        ...DEV_MOCK_DATA.company,
        id: "platform-owner",
        customer_id: "platform-owner",
        tenant_id: DEMO_TENANT_CONTEXT.tenant_id,
        company_name: "VARDHAN ERP PLATFORM",
        tenant_type: "platform_owner",
        data_scope: DEMO_TENANT_CONTEXT.data_scope,
        status: "approved",
      },
      role: {
        ...DEV_MOCK_DATA.role,
        id: PLATFORM_OWNER,
        key: PLATFORM_OWNER,
        code: PLATFORM_OWNER,
        name: "Platform Owner",
        permissions: ["all"],
      },
    };
  },

  isDemoLogin(email = "", password = "") {
    return (
      String(email).trim().toLowerCase() === DEMO_CREDENTIALS.email &&
      String(password) === DEMO_CREDENTIALS.password
    );
  },

  persistDemoSession(session) {
    const demoAuthState = this.createDemoAuthState(session);

    if (canUseLocalStorage()) {
      window.localStorage.setItem(DEMO_AUTH_STORAGE_KEY, JSON.stringify(demoAuthState));
    }

    if (canUseSessionStorage()) {
      window.sessionStorage.setItem(LEGACY_DEMO_SESSION_STORAGE_KEY, JSON.stringify(demoAuthState));
    }
  },

  getPersistedDemoSession() {
    try {
      const raw = canUseLocalStorage()
        ? window.localStorage.getItem(DEMO_AUTH_STORAGE_KEY)
        : null;

      if (raw) {
        return this.restoreDemoSession(JSON.parse(raw));
      }

      const legacyRaw = canUseSessionStorage()
        ? window.sessionStorage.getItem(LEGACY_DEMO_SESSION_STORAGE_KEY)
        : null;

      if (legacyRaw) {
        const legacySession = this.restoreDemoSession(JSON.parse(legacyRaw));
        this.persistDemoSession(legacySession);
        return legacySession;
      }

      return null;
    } catch {
      this.clearPersistedDemoSession();
      return null;
    }
  },

  clearPersistedDemoSession() {
    if (canUseLocalStorage()) {
      window.localStorage.removeItem(DEMO_AUTH_STORAGE_KEY);
    }

    if (canUseSessionStorage()) {
      window.sessionStorage.removeItem(LEGACY_DEMO_SESSION_STORAGE_KEY);
    }
  },

  validateSession(session) {
    return Boolean(session?.user);
  },

  createDemoAuthState(session) {
    return {
      isAuthenticated: true,
      role: PLATFORM_OWNER,
      email: DEMO_CREDENTIALS.email,
      tenant_id: DEMO_TENANT_CONTEXT.tenant_id,
      data_scope: DEMO_TENANT_CONTEXT.data_scope,
      session,
    };
  },

  restoreDemoSession(value) {
    if (value?.isAuthenticated && value?.role === PLATFORM_OWNER) {
      return value.session || this.getDemoSession();
    }

    if (value?.user) {
      return value;
    }

    return null;
  },
};

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function canUseSessionStorage() {
  return typeof window !== "undefined" && Boolean(window.sessionStorage);
}

function isDemoAuthEnabled() {
  const appMode = String(import.meta.env.VITE_APP_MODE || import.meta.env.APP_MODE || "").toLowerCase();
  return appMode === "demo" || !isSupabaseConfigured();
}

function isSupabaseConfigured() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}
