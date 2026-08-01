import { getSupabaseAuth } from "../../lib/supabase/SupabaseAuth.js";
import { AuthService as DemoAuthService } from "./AuthService.js";

/**
 * Hybrid Auth Service
 * Integrates Supabase Auth with existing demo auth for backward compatibility
 */
export const SupabaseAuthService = {
  /**
   * Login with Supabase or fallback to demo auth
   */
  async login({ email, password, provider = null } = {}) {
    console.log("[SupabaseAuthService] login called with email:", email, "provider:", provider);
    const supabaseAuth = getSupabaseAuth();
    console.log("[SupabaseAuthService] supabaseAuth.configured:", supabaseAuth.configured);

    // Try Supabase auth first if configured
    if (supabaseAuth.configured) {
      try {
        if (provider) {
          // OAuth login
          console.log("[SupabaseAuthService] Attempting OAuth login with provider:", provider);
          const result = await supabaseAuth.signInWithOAuth({ provider });
          console.log("[SupabaseAuthService] OAuth login result:", result);
          return this.formatSupabaseSession(result);
        } else {
          // Email/password login
          console.log("[SupabaseAuthService] Attempting email/password login");
          const result = await supabaseAuth.signIn({ email, password });
          console.log("[SupabaseAuthService] Email/password login result:", result);
          return this.formatSupabaseSession(result);
        }
      } catch (error) {
        console.error("[SupabaseAuthService] Supabase login failed:", error);
        throw new Error(error?.message || "Supabase authentication failed.");
      }
    }

    console.log("[SupabaseAuthService] Supabase not configured, falling back to demo auth");
    // Use demo auth if Supabase not configured
    if (isProductionMode()) throw new Error("Authentication provider is unavailable. Supabase must be configured in production.");
    return await DemoAuthService.login({ email, password });
  },

  /**
   * Logout from both Supabase and demo auth
   */
  async logout() {
    const supabaseAuth = getSupabaseAuth();

    // Logout from Supabase if configured
    if (supabaseAuth.configured) {
      try {
        await supabaseAuth.signOut();
      } catch (error) {
        console.error("Supabase logout failed:", error);
      }
    }

    // Always clear demo auth session
    return await DemoAuthService.logout();
  },

  /**
   * Refresh session from Supabase or demo auth
   */
  async refreshSession() {
    console.log("[SupabaseAuthService] refreshSession called");
    const supabaseAuth = getSupabaseAuth();
    console.log("[SupabaseAuthService] supabaseAuth.configured:", supabaseAuth.configured);

    // Try Supabase session refresh first
    if (supabaseAuth.configured) {
      try {
        console.log("[SupabaseAuthService] Attempting to get Supabase session");
        const session = await supabaseAuth.getSession();
        console.log("[SupabaseAuthService] Raw Supabase session:", session ? "Session exists" : "No session");
        if (session) {
          const formatted = this.formatSupabaseSession({ user: session.user, session });
          console.log("[SupabaseAuthService] Formatted session:", formatted ? "Formatted session exists" : "No formatted session");
          console.log("[SupabaseAuthService] Formatted user:", formatted?.user ? "User exists" : "No user");
          return formatted;
        }
      } catch (error) {
        console.error("[SupabaseAuthService] Supabase session refresh failed:", error);
      }
    }

    console.log("[SupabaseAuthService] Falling back to demo auth");
    // Fall back to demo auth
    if (isProductionMode()) return emptySession();
    return await DemoAuthService.refreshSession();
  },

  /**
   * Get current session from Supabase or demo auth
   */
  async getSession() {
    console.log("[SupabaseAuthService] getSession called");
    const supabaseAuth = getSupabaseAuth();
    console.log("[SupabaseAuthService] supabaseAuth.configured:", supabaseAuth.configured);

    if (supabaseAuth.configured) {
      try {
        console.log("[SupabaseAuthService] Attempting to get Supabase session");
        const session = await supabaseAuth.getSession();
        console.log("[SupabaseAuthService] Raw Supabase session:", session ? "Session exists" : "No session");
        if (session) {
          const formatted = this.formatSupabaseSession({ user: session.user, session });
          console.log("[SupabaseAuthService] Formatted session:", formatted ? "Formatted session exists" : "No formatted session");
          return formatted;
        }
      } catch (error) {
        console.error("[SupabaseAuthService] Failed to get Supabase session:", error);
      }
    }

    console.log("[SupabaseAuthService] Falling back to demo auth");
    // Fall back to demo auth
    if (isProductionMode()) return emptySession();
    const demoSession = DemoAuthService.getPersistedDemoSession();
    if (demoSession) {
      console.log("[SupabaseAuthService] Returning demo session");
      return demoSession;
    }

    console.log("[SupabaseAuthService] No session found, returning empty session");
    return { user: null, profile: null, company: null, role: null, modules: null };
  },

  /**
   * Sign up new user with Supabase
   */
  async signUp({ email, password, metadata = {} }) {
    const supabaseAuth = getSupabaseAuth();

    if (!supabaseAuth.configured) {
      throw new Error("Supabase is not configured for sign up");
    }

    const result = await supabaseAuth.signUp({ email, password, metadata });
    return this.formatSupabaseSession(result);
  },

  /**
   * Reset password
   */
  async resetPassword({ email }) {
    const supabaseAuth = getSupabaseAuth();

    if (!supabaseAuth.configured) {
      throw new Error("Supabase is not configured for password reset");
    }

    return await supabaseAuth.resetPassword({ email });
  },

  /**
   * Update password
   */
  async updatePassword({ password }) {
    const supabaseAuth = getSupabaseAuth();

    if (!supabaseAuth.configured) {
      throw new Error("Supabase is not configured for password update");
    }

    return await supabaseAuth.updatePassword({ password });
  },

  /**
   * Update user metadata
   */
  async updateUserMetadata({ metadata }) {
    const supabaseAuth = getSupabaseAuth();

    if (!supabaseAuth.configured) {
      throw new Error("Supabase is not configured for metadata update");
    }

    return await supabaseAuth.updateUserMetadata({ metadata });
  },

  /**
   * Get JWT access token for API requests
   */
  async getAccessToken() {
    const supabaseAuth = getSupabaseAuth();

    if (supabaseAuth.configured) {
      try {
        return await supabaseAuth.getAccessToken();
      } catch (error) {
        console.error("Failed to get access token:", error);
      }
    }

    return null;
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    const supabaseAuth = getSupabaseAuth();

    if (supabaseAuth.configured) {
      try {
        return await supabaseAuth.isAuthenticated();
      } catch (error) {
        console.error("Failed to check authentication status:", error);
      }
    }

    // Fall back to demo auth check
    const demoSession = DemoAuthService.getPersistedDemoSession();
    return DemoAuthService.validateSession(demoSession);
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback) {
    const supabaseAuth = getSupabaseAuth();

    if (supabaseAuth.configured) {
      return supabaseAuth.onAuthStateChange((event, session) => {
        if (session) {
          callback(event, this.formatSupabaseSession({ user: session.user, session }));
        } else {
          callback(event, { user: null, profile: null, company: null, role: null, modules: null });
        }
      });
    }

    // Return no-op for demo auth
    return () => {};
  },

  /**
   * Format Supabase session to match existing auth structure
   */
  formatSupabaseSession({ user, session }) {
    console.log("[SupabaseAuthService] formatSupabaseSession called, user:", user ? "User exists" : "No user", "session:", session ? "Session exists" : "No session");
    if (!user) {
      console.log("[SupabaseAuthService] No user, returning empty session");
      return { user: null, profile: null, company: null, role: null, modules: null };
    }

    const tenant_id = user.user_metadata?.tenant_id || user.app_metadata?.tenant_id || "own-chit-business";
    const tenantContext = {
      tenant_id,
      data_scope: user.user_metadata?.data_scope || user.app_metadata?.data_scope || "real_tenant",
      workspace_id: user.user_metadata?.workspace_id || user.app_metadata?.workspace_id,
    };

    const formatted = {
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata,
      },
      profile: {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split("@")[0],
        email: user.email,
        is_platform_admin: user.user_metadata?.is_platform_admin || false,
        status: "approved",
      },
      company: {
        id: tenantContext.tenant_id,
        workspace_id: tenantContext.workspace_id,
        workspaceId: tenantContext.workspace_id,
        customer_id: tenantContext.tenant_id,
        tenant_id: tenantContext.tenant_id,
        company_name: user.user_metadata?.company_name || "Default Company",
        tenant_type: user.user_metadata?.tenant_type || "real_tenant",
        data_scope: tenantContext.data_scope,
        status: "active",
      },
      role: {
        id: user.user_metadata?.role_id || "staff",
        key: user.user_metadata?.role_key || "STAFF",
        code: user.user_metadata?.role_code || "STAFF",
        name: user.user_metadata?.role_name || "Staff",
        permissions: user.user_metadata?.permissions || [],
      },
      modules: user.user_metadata?.modules || { chit_management: true },
      session: session,
    };
    console.log("[SupabaseAuthService] Formatted session user:", formatted.user ? "User exists" : "No user");
    console.log("[SupabaseAuthService] Formatted profile:", formatted.profile ? "Profile exists" : "No profile");
    console.log("[SupabaseAuthService] Formatted profile status:", formatted.profile?.status);
    return formatted;
  },

  /**
   * Get tenant context from current session
   */
  async getTenantContext() {
    const supabaseAuth = getSupabaseAuth();

    if (supabaseAuth.configured) {
      try {
        return await supabaseAuth.getTenantContext();
      } catch (error) {
        console.error("Failed to get tenant context:", error);
      }
    }

    // Fall back to demo auth tenant context
    const demoSession = DemoAuthService.getPersistedDemoSession();
    if (demoSession?.company) {
      return {
        tenant_id: demoSession.company.tenant_id,
        data_scope: demoSession.company.data_scope,
        workspace_id: demoSession.company.id,
      };
    }

    return null;
  },
};

function isProductionMode() {
  const mode = String(import.meta.env.VITE_APP_MODE || import.meta.env.MODE || "").toLowerCase();
  return mode === "production" || mode === "prod";
}

function emptySession() {
  return { user: null, profile: null, company: null, role: null, modules: null };
}
