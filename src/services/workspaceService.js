import {
  LICENSE_TYPES,
  WORKSPACE_MODULES,
  WORKSPACE_STATUS,
  WorkspaceRepository,
} from "../repositories/WorkspaceRepository";

export { LICENSE_TYPES, WORKSPACE_MODULES, WORKSPACE_STATUS };

export const workspaceService = {
  loadWorkspaces({ authWorkspaces = [], company = null } = {}) {
    const workspaces = WorkspaceRepository.listWorkspaces({ authWorkspaces, company });
    const persistedId = WorkspaceRepository.getPersistedWorkspaceId();
    const activeWorkspace =
      workspaces.find((workspace) => workspace.id === persistedId) ||
      workspaces[0] ||
      null;

    WorkspaceRepository.setCurrentWorkspace(activeWorkspace);

    return {
      workspaces,
      activeWorkspace,
      activeWorkspaceContext: WorkspaceRepository.getCurrentWorkspaceContext(),
      workspaceHealth: activeWorkspace ? getWorkspaceHealth(activeWorkspace) : null,
    };
  },

  switchWorkspace(workspaceId, options = {}) {
    const activeWorkspace = WorkspaceRepository.loadWorkspace(workspaceId, options);

    return {
      activeWorkspace,
      activeWorkspaceContext: WorkspaceRepository.getCurrentWorkspaceContext(),
      workspaceHealth: activeWorkspace ? getWorkspaceHealth(activeWorkspace) : null,
    };
  },

  getCurrentWorkspace() {
    return WorkspaceRepository.getCurrentWorkspace();
  },

  getCurrentWorkspaceContext() {
    return WorkspaceRepository.getCurrentWorkspaceContext();
  },

  getWorkspaceHealth,
};

function getWorkspaceHealth(workspace) {
  const seatLimit = Number(workspace.settings?.seats || 0);
  const activeUsers = Number(workspace.activeUsers || 0);
  const usageRate = seatLimit ? Math.round((activeUsers / seatLimit) * 100) : 0;
  const isOperational = workspace.status === WORKSPACE_STATUS.ACTIVE;
  const isLicenseStrong = [
    LICENSE_TYPES.FOUNDER,
    LICENSE_TYPES.LIFETIME,
    LICENSE_TYPES.YEARLY,
    LICENSE_TYPES.ENTERPRISE,
  ].includes(workspace.licenseType);
  const score = Math.max(
    0,
    Math.min(100, (isOperational ? 62 : 20) + (isLicenseStrong ? 22 : 12) + Math.min(usageRate, 16))
  );

  return {
    score,
    status: score >= 80 ? "Healthy" : score >= 60 ? "Stable" : "Needs Attention",
    usageRate,
    currentPlan: workspace.plan,
    activeModule: workspace.module,
    licenseBadge: workspace.licenseType,
  };
}
