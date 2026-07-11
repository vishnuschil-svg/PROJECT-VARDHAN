import {
  CHIT_MANAGEMENT_ERP,
  COLLEGE_ERP,
  PRIVATE_HOSTELS_ERP,
  SCHOOL_ERP,
} from "../config/erpModules";
import {
  PRODUCT_CATALOG,
  PRODUCT_SUBSCRIPTIONS,
  getProductById,
} from "../config/productLicensing";
import { WORKSPACE_MODULES, WorkspaceRepository } from "./WorkspaceRepository";

const MODULE_TO_PRODUCT = {
  [WORKSPACE_MODULES.MITRA_NIDHI_CHITI_PRO]: CHIT_MANAGEMENT_ERP,
  [WORKSPACE_MODULES.SCHOOL_ERP]: SCHOOL_ERP,
  [WORKSPACE_MODULES.COLLEGE_ERP]: COLLEGE_ERP,
  [WORKSPACE_MODULES.PRIVATE_HOSTELS_ERP]: PRIVATE_HOSTELS_ERP,
};

export const LicenseRepository = {
  getLicenseSnapshot(workspace = null) {
    const activeWorkspace = workspace || WorkspaceRepository.getCurrentWorkspace();
    const productId = MODULE_TO_PRODUCT[activeWorkspace?.module] || activeWorkspace?.settings?.productId;
    const subscription = findSubscription({ workspace: activeWorkspace, productId });

    return {
      workspace: activeWorkspace,
      product: getProductById(productId) || PRODUCT_CATALOG.find((item) => item.id === productId) || null,
      subscription,
      productId,
      supportedModules: [
        "MITRA_NIDHI_CHITI_PRO",
        "SCHOOL_ERP",
        "COLLEGE_ERP",
        "PRIVATE_HOSTELS_ERP",
      ],
    };
  },

  listTenantSubscriptions(workspace = null) {
    const activeWorkspace = workspace || WorkspaceRepository.getCurrentWorkspace();
    const tenantId = activeWorkspace?.settings?.tenantId || activeWorkspace?.tenant_id || activeWorkspace?.tenantId;
    const customerId = activeWorkspace?.customerId;

    return PRODUCT_SUBSCRIPTIONS.filter(
      (subscription) => subscription.tenantId === tenantId || subscription.customerId === customerId
    );
  },
};

function findSubscription({ workspace, productId }) {
  const tenantSubscriptions = LicenseRepository.listTenantSubscriptions(workspace);

  return tenantSubscriptions.find((subscription) => subscription.productId === productId)
    || tenantSubscriptions[0]
    || buildWorkspaceSubscription(workspace, productId);
}

function buildWorkspaceSubscription(workspace, productId) {
  return {
    id: workspace?.id || "workspace-license",
    customerId: workspace?.customerId || "",
    tenantId: workspace?.settings?.tenantId || "",
    productId,
    planType: workspace?.plan || "Standard",
    billingCycle: workspace?.licenseType || "Monthly",
    status: String(workspace?.status || "inactive").toLowerCase(),
    seats: workspace?.settings?.seats || 0,
    usedSeats: workspace?.activeUsers || 0,
    licenseKey: "",
    startsOn: workspace?.createdAt || "",
    expiresOn: workspace?.settings?.expiresOn || "",
  };
}
