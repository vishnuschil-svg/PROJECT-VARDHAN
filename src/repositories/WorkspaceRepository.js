import {
  CHIT_MANAGEMENT_ERP,
  COLLEGE_ERP,
  PRIVATE_HOSTELS_ERP,
  SCHOOL_ERP,
} from "../config/erpModules.js";
import { CUSTOMER_ACCESS_SEED } from "../config/customerAccess.js";
import {
  PRODUCT_CATALOG,
  PRODUCT_SUBSCRIPTIONS,
  SUBSCRIPTION_STATUS,
  getProductById,
} from "../config/productLicensing.js";

const ACTIVE_WORKSPACE_KEY = "vardhan.workspace.active.v1";

export const WORKSPACE_MODULES = {
  MITRA_NIDHI_CHITI_PRO: "MITRA_NIDHI_CHITI_PRO",
  SCHOOL_ERP: "SCHOOL_ERP",
  COLLEGE_ERP: "COLLEGE_ERP",
  PRIVATE_HOSTELS_ERP: "PRIVATE_HOSTELS_ERP",
};

export const LICENSE_TYPES = {
  FOUNDER: "FOUNDER",
  DEMO: "DEMO",
  TRIAL: "TRIAL",
  LIFETIME: "LIFETIME",
  MONTHLY: "MONTHLY",
  YEARLY: "YEARLY",
  ENTERPRISE: "ENTERPRISE",
};

export const WORKSPACE_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  EXPIRED: "EXPIRED",
  SUSPENDED: "SUSPENDED",
};

let currentWorkspace = null;

export const WorkspaceRepository = {
  listWorkspaces({ authWorkspaces = [], company = null } = {}) {
    const allowedTenantIds = new Set(
      authWorkspaces
        .map((workspace) => workspace.tenant_id || workspace.tenantId)
        .filter(Boolean)
    );
    const records = buildWorkspaceRecords().filter(
      (workspace) => !allowedTenantIds.size || allowedTenantIds.has(workspace.settings.tenantId)
    );
    const fallback = buildFallbackWorkspace({ authWorkspaces, company });
    const merged = fallback && !records.some((workspace) => workspace.id === fallback.id)
      ? [fallback, ...records]
      : records;

    return merged.sort((a, b) => a.businessName.localeCompare(b.businessName));
  },

  getWorkspaceById(workspaceId, options = {}) {
    return this.listWorkspaces(options).find((workspace) => workspace.id === workspaceId) || null;
  },

  loadWorkspace(workspaceId, options = {}) {
    const workspace = this.getWorkspaceById(workspaceId, options) || this.listWorkspaces(options)[0] || null;
    currentWorkspace = workspace;
    writeActiveWorkspaceId(workspace?.id || "");
    return workspace;
  },

  getPersistedWorkspaceId() {
    return readActiveWorkspaceId();
  },

  setCurrentWorkspace(workspace) {
    currentWorkspace = workspace || null;
    writeActiveWorkspaceId(currentWorkspace?.id || "");
    return currentWorkspace;
  },

  getCurrentWorkspace() {
    return currentWorkspace;
  },

  getCurrentWorkspaceContext() {
    return currentWorkspace ? createTenantContext(currentWorkspace) : null;
  },
};

function buildWorkspaceRecords() {
  return PRODUCT_SUBSCRIPTIONS
    .map((subscription) => {
      const customer = CUSTOMER_ACCESS_SEED.find((item) => item.id === subscription.customerId);
      const product = getProductById(subscription.productId);
      const module = mapProductModule(subscription.productId);

      if (!customer || !product || !module) {
        return null;
      }

      return createWorkspaceModel({
        customer,
        product,
        subscription,
        module,
      });
    })
    .filter(Boolean);
}

function buildFallbackWorkspace({ authWorkspaces = [], company = null }) {
  const authWorkspace = authWorkspaces[0];

  if (!authWorkspace && !company) {
    return null;
  }

  const tenantId = authWorkspace?.tenant_id || authWorkspace?.tenantId || company?.tenant_id || company?.id;
  const customerId = authWorkspace?.customerId || company?.customer_id || company?.id || tenantId;
  const customer = CUSTOMER_ACCESS_SEED.find(
    (item) => item.id === customerId || item.tenantId === tenantId
  ) || {
    id: customerId,
    name: authWorkspace?.customerName || company?.company_name || "Customer Workspace",
    owner: company?.owner || company?.full_name || "Workspace Owner",
    tenantId,
    dataScope: authWorkspace?.data_scope || authWorkspace?.dataScope || company?.data_scope || "real_tenant",
    status: "active",
    joined: "2024-01-01",
  };
  const product = PRODUCT_CATALOG.find((item) => item.id === CHIT_MANAGEMENT_ERP);

  return createWorkspaceModel({
    customer,
    product,
    subscription: {
      id: `workspace-${customer.id}-${CHIT_MANAGEMENT_ERP}`,
      customerId: customer.id,
      tenantId: customer.tenantId || tenantId,
      planType: customer.subscription || "Professional",
      billingCycle: "Lifetime",
      status: SUBSCRIPTION_STATUS.ACTIVE,
      seats: 10,
      usedSeats: 1,
      startsOn: customer.joined || "2024-01-01",
      expiresOn: "Lifetime",
    },
    module: WORKSPACE_MODULES.MITRA_NIDHI_CHITI_PRO,
  });
}

function createWorkspaceModel({ customer, product, subscription, module }) {
  return {
    id: `${subscription.customerId}:${subscription.productId || product.id}`,
    customerId: subscription.customerId,
    businessName: customer.name,
    businessType: customer.customerType || "customer",
    module,
    plan: subscription.planType || "Standard",
    licenseType: mapLicenseType(subscription),
    status: mapWorkspaceStatus(subscription.status || customer.status),
    owner: customer.owner || "Workspace Owner",
    createdAt: subscription.startsOn || customer.joined || "",
    lastLogin: new Date().toISOString().slice(0, 10),
    activeUsers: Number(subscription.usedSeats || 0),
    logo: createLogo(customer.name),
    settings: {
      tenantId: subscription.tenantId || customer.tenantId,
      dataScope: customer.dataScope || product.dataScope,
      productId: subscription.productId || product.id,
      productName: product.productName,
      seats: Number(subscription.seats || 0),
      expiresOn: subscription.expiresOn || "",
      route: product.path || "/dashboard",
    },
  };
}

function mapProductModule(productId) {
  const map = {
    [CHIT_MANAGEMENT_ERP]: WORKSPACE_MODULES.MITRA_NIDHI_CHITI_PRO,
    [SCHOOL_ERP]: WORKSPACE_MODULES.SCHOOL_ERP,
    [COLLEGE_ERP]: WORKSPACE_MODULES.COLLEGE_ERP,
    [PRIVATE_HOSTELS_ERP]: WORKSPACE_MODULES.PRIVATE_HOSTELS_ERP,
  };

  return map[productId] || null;
}

function mapLicenseType(subscription) {
  const plan = String(subscription.planType || "").toUpperCase();
  const billing = String(subscription.billingCycle || "").toUpperCase();

  if (plan.includes("INTERNAL")) return LICENSE_TYPES.FOUNDER;
  if (plan.includes("DEMO")) return LICENSE_TYPES.DEMO;
  if (plan.includes("TRIAL")) return LICENSE_TYPES.TRIAL;
  if (plan.includes("ENTERPRISE")) return LICENSE_TYPES.ENTERPRISE;
  if (billing.includes("LIFETIME")) return LICENSE_TYPES.LIFETIME;
  if (billing.includes("YEAR")) return LICENSE_TYPES.YEARLY;
  if (billing.includes("MONTH")) return LICENSE_TYPES.MONTHLY;
  return LICENSE_TYPES.MONTHLY;
}

function mapWorkspaceStatus(status) {
  const normalizedStatus = String(status || "").toLowerCase();

  if (normalizedStatus === SUBSCRIPTION_STATUS.SUSPENDED || normalizedStatus === "suspended") {
    return WORKSPACE_STATUS.SUSPENDED;
  }
  if (normalizedStatus === SUBSCRIPTION_STATUS.EXPIRED || normalizedStatus === "expired") {
    return WORKSPACE_STATUS.EXPIRED;
  }
  if (normalizedStatus === SUBSCRIPTION_STATUS.ACTIVE || normalizedStatus === SUBSCRIPTION_STATUS.TRIAL || normalizedStatus === "active" || normalizedStatus === "trial") {
    return WORKSPACE_STATUS.ACTIVE;
  }
  return WORKSPACE_STATUS.INACTIVE;
}

function createLogo(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "VW";
}

function createTenantContext(workspace) {
  return {
    workspace_id: workspace.id,
    workspace_label: workspace.businessName,
    customer_id: workspace.customerId,
    tenant_id: workspace.settings.tenantId,
    data_scope: workspace.settings.dataScope,
    module: workspace.module,
  };
}

function readActiveWorkspaceId() {
  if (!canUseLocalStorage()) {
    return "";
  }

  return window.localStorage.getItem(ACTIVE_WORKSPACE_KEY) || "";
}

function writeActiveWorkspaceId(workspaceId) {
  if (!canUseLocalStorage()) {
    return;
  }

  if (workspaceId) {
    window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
  } else {
    window.localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
  }
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}
