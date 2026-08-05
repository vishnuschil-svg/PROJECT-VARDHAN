/* eslint-disable react/only-export-components */
import { createContext, useCallback, useEffect, useState } from "react";
import { PermissionService, SessionService, WorkspaceService } from "../services/auth";
import { SupabaseAuthService } from "../services/auth/SupabaseAuthService";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [company, setCompany] = useState(null);
  const [role, setRole] = useState(null);
  const [modules, setModules] = useState(null);
  const [workspaceOptions, setWorkspaceOptions] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setProfile(null);
    setCompany(null);
    setRole(null);
    setModules(null);
    setWorkspaceOptions([]);
    setActiveWorkspace(null);
    setPermissions(null);
  }, []);

  const switchWorkspace = useCallback(
    (workspaceId) => {
      const nextSession = SessionService.switchWorkspace(
        {
          user,
          profile,
          company,
          role,
          modules,
          workspaceOptions,
          activeWorkspace,
        },
        workspaceId
      );

      if (nextSession.activeWorkspace) {
        setActiveWorkspace(nextSession.activeWorkspace);
        setPermissions(nextSession.permissions);
      }
    },
    [activeWorkspace, company, modules, profile, role, user, workspaceOptions]
  );

  const applySession = useCallback((session) => {
    if (!session?.user) {
      clearAuthState();
      setLoading(false);
      return;
    }

    setUser(session.user);
    setProfile(session.profile);
    setCompany(session.company);
    setRole(session.role);
    setModules(session.modules);
    setWorkspaceOptions(session.workspaceOptions);
    setActiveWorkspace(session.activeWorkspace);
    setPermissions(session.permissions);
    setLoading(false);
  }, [clearAuthState]);

  const login = useCallback(async (credentials) => {
    const session = await SessionService.login(credentials);
    applySession(session);
    return session;
  }, [applySession]);

  const logout = useCallback(async () => {
    await SessionService.logout();
    clearAuthState();
  }, [clearAuthState]);

  const loadUser = useCallback(async () => {
    console.log("[AuthContext] loadUser called");
    const session = await SessionService.refreshSession();
    console.log("[AuthContext] Session from refreshSession:", session ? "Session exists" : "No session");
    console.log("[AuthContext] Session user:", session?.user ? "User exists" : "No user");
    console.log("[AuthContext] Session profile:", session?.profile ? "Profile exists" : "No profile");
    applySession(session);

  }, [applySession]);

  useEffect(() => {
    loadUser();

    const unsubscribe = SupabaseAuthService.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        clearAuthState();
      } else if (session?.user) {
        loadUser();
      }
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [loadUser, clearAuthState, applySession]);

  return (

    <AuthContext.Provider
      value={{
        user,
        profile,
        company,
        role,
        modules,
        permissions,
        workspaceOptions,
        activeWorkspace,
        activeTenantContext: WorkspaceService.getActiveTenantContext(activeWorkspace),
        activeTenantId: activeWorkspace?.tenant_id || activeWorkspace?.tenantId || null,
        activeDataScope: activeWorkspace?.data_scope || activeWorkspace?.dataScope || null,
        loading,
        login,
        logout,
        clearAuthState,
        loadUser,
        switchWorkspace,
        refreshSession: loadUser,
        can: (action, moduleId) => PermissionService.can({
          action,
          moduleId,
          permissions,
          profile,
          role,
          modules,
        }),
      }}
    >
      {children}
    </AuthContext.Provider>

  );

}
