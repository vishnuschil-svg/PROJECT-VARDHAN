import { AuthService } from "./AuthService";
import { SupabaseAuthService } from "./SupabaseAuthService.js";
import { PermissionService } from "./PermissionService";
import { WorkspaceService } from "./WorkspaceService";

export const SessionService = {
  async login(credentials) {
    const session = await getAuthService().login(credentials);
    return this.hydrateSession(session);
  },

  async logout() {
    const session = await getAuthService().logout();
    return this.hydrateSession(session);
  },

  async refreshSession() {
    const session = await getAuthService().refreshSession();
    return this.hydrateSession(session);
  },

  hydrateSession(session = {}, currentWorkspace = null) {
    const workspaceOptions = WorkspaceService.getWorkspaceOptions({
      profile: session.profile,
      role: session.role,
      company: session.company,
    });
    const activeWorkspace = WorkspaceService.resolveActiveWorkspace({
      currentWorkspace,
      workspaceOptions,
    });
    const activeTenantContext = WorkspaceService.getActiveTenantContext(activeWorkspace);
    const permissions = PermissionService.buildPermissions({
      profile: session.profile,
      role: session.role,
      modules: session.modules,
      activeWorkspace,
    });

    return {
      ...session,
      workspaceOptions,
      activeWorkspace,
      activeTenantContext,
      permissions,
    };
  },

  switchWorkspace(session = {}, workspaceId) {
    const activeWorkspace = WorkspaceService.switchWorkspace(session.workspaceOptions, workspaceId);
    const nextWorkspace = activeWorkspace || session.activeWorkspace;
    const activeTenantContext = WorkspaceService.getActiveTenantContext(nextWorkspace);
    const permissions = PermissionService.buildPermissions({
      profile: session.profile,
      role: session.role,
      modules: session.modules,
      activeWorkspace: nextWorkspace,
    });

    return {
      ...session,
      activeWorkspace: nextWorkspace,
      activeTenantContext,
      permissions,
    };
  },
};

function getAuthService() {
  const mode = String(import.meta.env.VITE_APP_MODE || import.meta.env.MODE || "").toLowerCase();
  const repositoryBackend = String(import.meta.env.VITE_REPOSITORY_BACKEND || "").toLowerCase();
  const isSupabaseBackend = repositoryBackend === "supabase";

  // Check if Supabase is actually configured with credentials
  const hasSupabaseCredentials = Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  // Use Supabase auth if explicitly configured or in production mode with Supabase backend
  const useSupabase = hasSupabaseCredentials ||
                      (mode === "production" || mode === "prod") && isSupabaseBackend;

  console.log("[SessionService] getAuthService - mode:", mode, "repositoryBackend:", repositoryBackend, "hasSupabaseCredentials:", hasSupabaseCredentials, "useSupabase:", useSupabase);

  return useSupabase ? SupabaseAuthService : AuthService;
}
