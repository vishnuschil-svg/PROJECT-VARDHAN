import { getSupabaseClient, isSupabaseConfigured } from "./SupabaseClient.js";

/**
 * Supabase Authentication Integration
 * Handles Supabase Auth operations while maintaining compatibility with existing demo auth
 */
export class SupabaseAuth {
  constructor() {
    this.client = getSupabaseClient();
    this.configured = isSupabaseConfigured;
  }

  /**
   * Sign up a new user
   */
  async signUp({ email, password, metadata = {} }) {
    if (!this.configured) {
      throw new Error("Supabase is not configured");
    }

    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) {
      throw new Error(`Sign up failed: ${error.message}`);
    }

    return {
      user: data.user,
      session: data.session,
      requiresEmailVerification: !data.session,
    };
  }

  /**
   * Sign in with email and password
   */
  async signIn({ email, password }) {
    if (!this.configured) {
      throw new Error("Supabase is not configured");
    }

    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(`Sign in failed: ${error.message}`);
    }

    return {
      user: data.user,
      session: data.session,
    };
  }

  /**
   * Sign in with OAuth provider
   */
  async signInWithOAuth({ provider, options = {} }) {
    if (!this.configured) {
      throw new Error("Supabase is not configured");
    }

    const { data, error } = await this.client.auth.signInWithOAuth({
      provider,
      options,
    });

    if (error) {
      throw new Error(`OAuth sign in failed: ${error.message}`);
    }

    return data;
  }

  /**
   * Sign out current user
   */
  async signOut() {
    if (!this.configured) {
      throw new Error("Supabase is not configured");
    }

    const { error } = await this.client.auth.signOut();

    if (error) {
      throw new Error(`Sign out failed: ${error.message}`);
    }

    return { success: true };
  }

  /**
   * Get current session
   */
  async getSession() {
    console.log("[SupabaseAuth] getSession called, configured:", this.configured);
    if (!this.configured) {
      console.log("[SupabaseAuth] Not configured, returning null");
      return null;
    }

    const { data: { session }, error } = await this.client.auth.getSession();
    console.log("[SupabaseAuth] getSession result:", session ? "Session exists" : "No session", "error:", error);

    if (error) {
      console.error("[SupabaseAuth] Failed to get session:", error);
      return null;
    }

    return session;
  }

  /**
   * Get current user
   */
  async getUser() {
    if (!this.configured) {
      return null;
    }

    const { data: { user }, error } = await this.client.auth.getUser();

    if (error) {
      console.error("Failed to get user:", error);
      return null;
    }

    return user;
  }

  /**
   * Refresh session
   */
  async refreshSession() {
    if (!this.configured) {
      throw new Error("Supabase is not configured");
    }

    const { data, error } = await this.client.auth.refreshSession();

    if (error) {
      throw new Error(`Session refresh failed: ${error.message}`);
    }

    return {
      user: data.user,
      session: data.session,
    };
  }

  /**
   * Reset password
   */
  async resetPassword({ email }) {
    if (!this.configured) {
      throw new Error("Supabase is not configured");
    }

    const { error } = await this.client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw new Error(`Password reset failed: ${error.message}`);
    }

    return { success: true };
  }

  /**
   * Update password
   */
  async updatePassword({ password }) {
    if (!this.configured) {
      throw new Error("Supabase is not configured");
    }

    const { error } = await this.client.auth.updateUser({
      password,
    });

    if (error) {
      throw new Error(`Password update failed: ${error.message}`);
    }

    return { success: true };
  }

  /**
   * Update user metadata
   */
  async updateUserMetadata({ metadata }) {
    if (!this.configured) {
      throw new Error("Supabase is not configured");
    }

    const { data, error } = await this.client.auth.updateUser({
      data: metadata,
    });

    if (error) {
      throw new Error(`Metadata update failed: ${error.message}`);
    }

    return {
      user: data.user,
    };
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback) {
    if (!this.configured) {
      return () => {};
    }

    const { data: { subscription } } = this.client.auth.onAuthStateChange(
      (event, session) => {
        callback(event, session);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Get JWT token for API requests
   */
  async getAccessToken() {
    if (!this.configured) {
      return null;
    }

    const session = await this.getSession();
    return session?.access_token || null;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    const session = await this.getSession();
    return Boolean(session);
  }

  /**
   * Get user role from metadata
   */
  async getUserRole() {
    const user = await this.getUser();
    return user?.user_metadata?.role || user?.app_metadata?.role || null;
  }

  /**
   * Get tenant context from user metadata
   */
  async getTenantContext() {
    const user = await this.getUser();
    if (!user) return null;

    return {
      tenant_id: user.user_metadata?.tenant_id || user.app_metadata?.tenant_id,
      data_scope: user.user_metadata?.data_scope || user.app_metadata?.data_scope,
      workspace_id: user.user_metadata?.workspace_id || user.app_metadata?.workspace_id,
    };
  }
}

/**
 * Factory function to create Supabase auth instance
 */
export function createSupabaseAuth() {
  return new SupabaseAuth();
}

/**
 * Singleton instance
 */
let supabaseAuthInstance = null;

export function getSupabaseAuth() {
  if (!supabaseAuthInstance) {
    supabaseAuthInstance = createSupabaseAuth();
  }
  return supabaseAuthInstance;
}
