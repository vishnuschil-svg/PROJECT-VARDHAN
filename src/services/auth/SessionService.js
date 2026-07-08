import { AuthService } from "./AuthService";
import { PermissionService } from "./PermissionService";
import { WorkspaceService } from "./WorkspaceService";

export const SessionService = {
  async login(credentials) {
    const session = await AuthService.login(credentials);
    return this.hydrateSession(session);
  },

  async logout() {
    const session = await AuthService.logout();
    return this.hydrateSession(session);
  },

  async refreshSession() {
    const session = await AuthService.refreshSession();
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
