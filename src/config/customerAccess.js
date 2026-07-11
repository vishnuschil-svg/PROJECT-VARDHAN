import {
  CHIT_MANAGEMENT_ERP,
  FINANCE_ERP,
  HOSPITAL_ERP,
  SCHOOL_ERP,
} from "./erpModules.js";

export const CUSTOMER_TYPES = {
  DEMO_CUSTOMER: "demo_customer",
  REAL_BUSINESS_CUSTOMER: "real_business_customer",
  OWN_BUSINESS: "own_business",
};

export const CUSTOMER_TYPE_LABELS = {
  [CUSTOMER_TYPES.DEMO_CUSTOMER]: "Demo Customer",
  [CUSTOMER_TYPES.REAL_BUSINESS_CUSTOMER]: "Real Business Customer",
  [CUSTOMER_TYPES.OWN_BUSINESS]: "Own Business",
};

export const WEBSITE_ACCESS_LABELS = {
  MY_BUSINESS: "My Business",
  DEMO_CUSTOMER: "Demo Customer",
  PAID_CUSTOMER: "Paid Customer",
};

export const CUSTOMER_ACCESS_LABELS = {
  [CUSTOMER_TYPES.DEMO_CUSTOMER]: WEBSITE_ACCESS_LABELS.DEMO_CUSTOMER,
  [CUSTOMER_TYPES.REAL_BUSINESS_CUSTOMER]: WEBSITE_ACCESS_LABELS.PAID_CUSTOMER,
  [CUSTOMER_TYPES.OWN_BUSINESS]: WEBSITE_ACCESS_LABELS.MY_BUSINESS,
};

export const CUSTOMER_DATA_SCOPES = {
  DEMO_SANDBOX: "demo_sandbox",
  REAL_TENANT: "real_tenant",
  OWN_BUSINESS: "own_business",
};

export const CUSTOMER_TYPE_VARIANTS = {
  [CUSTOMER_TYPES.DEMO_CUSTOMER]: "warning",
  [CUSTOMER_TYPES.REAL_BUSINESS_CUSTOMER]: "primary",
  [CUSTOMER_TYPES.OWN_BUSINESS]: "success",
};

export const CUSTOMER_STATUS_VARIANTS = {
  active: "success",
  trial: "warning",
  suspended: "error",
};

export const CUSTOMER_ACCESS_SEED = [
  {
    id: "tenant-own-chit",
    name: "VARDHAN Own Chit Business",
    owner: "Vishnu Vardhan Reddy",
    email: "owner@vardhanerp.com",
    phone: "+91 9000000000",
    customerType: CUSTOMER_TYPES.OWN_BUSINESS,
    tenantId: "own-chit-business",
    dataScope: CUSTOMER_DATA_SCOPES.OWN_BUSINESS,
    status: "active",
    subscription: "Internal",
    joined: "2024-01-01",
    assignedModules: {
      [CHIT_MANAGEMENT_ERP]: true,
    },
  },
  {
    id: "tenant-demo-school",
    name: "Demo School Tenant",
    owner: "Demo Admin",
    email: "demo.school@vardhanerp.com",
    phone: "+91 9888888888",
    customerType: CUSTOMER_TYPES.DEMO_CUSTOMER,
    tenantId: "demo-school-tenant",
    dataScope: CUSTOMER_DATA_SCOPES.DEMO_SANDBOX,
    status: "trial",
    subscription: "Demo",
    joined: "2024-03-10",
    assignedModules: {
      [SCHOOL_ERP]: true,
      [FINANCE_ERP]: true,
    },
  },
  {
    id: "tenant-real-finance",
    name: "Finance Innovations",
    owner: "Priya Sharma",
    email: "info@financeinno.com",
    phone: "+91 8765432109",
    customerType: CUSTOMER_TYPES.REAL_BUSINESS_CUSTOMER,
    tenantId: "real-finance-innovations",
    dataScope: CUSTOMER_DATA_SCOPES.REAL_TENANT,
    status: "active",
    subscription: "Professional",
    joined: "2024-02-20",
    assignedModules: {
      [FINANCE_ERP]: true,
    },
  },
  {
    id: "tenant-real-hospital",
    name: "Care Plus Hospital",
    owner: "Dr. Arun Kumar",
    email: "admin@careplus.example",
    phone: "+91 9876543210",
    customerType: CUSTOMER_TYPES.REAL_BUSINESS_CUSTOMER,
    tenantId: "real-care-plus-hospital",
    dataScope: CUSTOMER_DATA_SCOPES.REAL_TENANT,
    status: "active",
    subscription: "Enterprise",
    joined: "2024-04-05",
    assignedModules: {
      [HOSPITAL_ERP]: true,
    },
  },
];

export function countAssignedModules(assignedModules = {}) {
  return Object.values(assignedModules).filter(Boolean).length;
}

export function isDemoCustomer(customer) {
  return customer?.customerType === CUSTOMER_TYPES.DEMO_CUSTOMER;
}

export function canViewCustomerData(viewerCustomer, targetCustomer) {
  if (!viewerCustomer || !targetCustomer) {
    return false;
  }

  if (isDemoCustomer(viewerCustomer)) {
    return (
      isDemoCustomer(targetCustomer) &&
      viewerCustomer.tenantId === targetCustomer.tenantId
    );
  }

  return viewerCustomer.tenantId === targetCustomer.tenantId;
}
