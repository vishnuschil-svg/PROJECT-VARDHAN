import { isPlatformOwner } from "../../config/erpModules";
import {
  getCustomerWorkspace,
  getPlatformOwnerWorkspaces,
} from "../../config/workspaceAccess";

export const WorkspaceService = {
  getWorkspaceOptions({ profile, role, company } = {}) {
    const customerWorkspace = getCustomerWorkspace(company || profile);

    if (!isPlatformOwner(profile, role)) {
      return [customerWorkspace];
    }

    if (customerWorkspace?.workspace_id) {
      return [
        customerWorkspace,
        ...getPlatformOwnerWorkspaces().filter(
          (option) =>
            option.id !== customerWorkspace.id &&
            option.tenant_id !== customerWorkspace.tenant_id
        ),
      ];
    }

    return getPlatformOwnerWorkspaces();
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

    const workspaceId =
      activeWorkspace.workspace_id ||
      activeWorkspace.workspaceId ||
      activeWorkspace.id;

    return {
      workspace_id: workspaceId,
      workspace_label: activeWorkspace.label,
      customer_id: activeWorkspace.customerId,
      tenant_id: activeWorkspace.tenant_id || activeWorkspace.tenantId,
      customer_type: activeWorkspace.customerType,
      data_scope: activeWorkspace.data_scope || activeWorkspace.dataScope,
    };
  },
};
