/* eslint-disable react/only-export-components */
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { workspaceService } from "../services/workspaceService";

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { workspaceOptions, company, activeWorkspace: authWorkspace } = useAuth();
  const [workspaceState, setWorkspaceState] = useState({
    workspaces: [],
    activeWorkspace: null,
    activeWorkspaceContext: null,
    workspaceHealth: null,
  });

  const loadWorkspaceState = useCallback(() => {
    setWorkspaceState(
      workspaceService.loadWorkspaces({
        authWorkspaces: workspaceOptions,
        company,
        activeAuthWorkspace: authWorkspace,
      })
    );
  }, [authWorkspace, company, workspaceOptions]);

  useEffect(() => {
    loadWorkspaceState();
  }, [loadWorkspaceState, authWorkspace]);

  const switchWorkspace = useCallback(
    (workspaceId) => {
      setWorkspaceState((current) => ({
        ...current,
        ...workspaceService.switchWorkspace(workspaceId, {
          authWorkspaces: workspaceOptions,
          company,
        }),
      }));
    },
    [company, workspaceOptions]
  );

  const value = useMemo(
    () => ({
      ...workspaceState,
      switchWorkspace,
      reloadWorkspaces: loadWorkspaceState,
    }),
    [loadWorkspaceState, switchWorkspace, workspaceState]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
