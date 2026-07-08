import { isPlatformOwner } from "../../config/erpModules";
import {
  getCustomerWorkspace,
  getPlatformOwnerWorkspaces,
} from "../../config/workspaceAccess";

export const WorkspaceService = {
  getWorkspaceOptions({ profile, role, company } = {}) {
    return isPlatformOwner(profile, role)
      ? getPlatformOwnerWorkspaces()
      : [getCustomerWorkspace(company || profile)];
  },

  resolveActiveWorkspace({ currentWorkspace, workspaceOptions = [] } = {}) {
    if (!workspaceOptions.length) {
      return null;
    }

    if (currentWorkspace) {
      const existing = workspaceOptions.find((option) => option.id === currentWorkspace.id);

      if (existing) {
        return existing;
      }
    }

    return workspaceOptions[0];
  },

  switchWorkspace(workspaceOptions = [], workspaceId) {
    return workspaceOptions.find((option) => option.id === workspaceId) || null;
  },

  getActiveTenantContext(activeWorkspace) {
    if (!activeWorkspace) {
      return null;
    }

    return {
      workspace_id: activeWorkspace.id,
      workspace_label: activeWorkspace.label,
      customer_id: activeWorkspace.customerId,
      tenant_id: activeWorkspace.tenant_id || activeWorkspace.tenantId,
      customer_type: activeWorkspace.customerType,
      data_scope: activeWorkspace.data_scope || activeWorkspace.dataScope,
    };
  },
};
