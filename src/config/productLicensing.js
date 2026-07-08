import {
  CHIT_MANAGEMENT_ERP,
  COLLEGE_ERP,
  INSURANCE_CRM,
  PRIVATE_HOSTELS_ERP,
  SCHOOL_ERP,
} from "./erpModules";
import { CUSTOMER_ACCESS_SEED } from "./customerAccess";

export const PRODUCT_STATUS = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  COMING_SOON: "Coming Soon",
};

export const SUBSCRIPTION_STATUS = {
  ACTIVE: "active",
  TRIAL: "trial",
  EXPIRED: "expired",
  SUSPENDED: "suspended",
  NONE: "none",
};

export const PLAN_TYPES = {
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  HALF_YEARLY: "halfYearly",
  YEARLY: "yearly",
  LIFETIME: "lifetime",
};

export const PRODUCT_CATALOG = [
  {
    id: CHIT_MANAGEMENT_ERP,
    productCode: "MNC-PRO",
    productName: "MITRA NIDHI CHITI PRO",
    shortName: "CHIT",
    description: "Enterprise chit fund operations for groups, members, auctions, collections, dividends and receipts.",
    status: PRODUCT_STATUS.ACTIVE,
    version: "2.1.0",
    trialAvailable: true,
    isActive: true,
    path: "/chits",
    dataScope: "tenant_chit_operations",
    plans: {
      monthly: 2999,
      quarterly: 7999,
      halfYearly: 14999,
      yearly: 24999,
      lifetime: 149999,
    },
  },
  {
    id: SCHOOL_ERP,
    productCode: "SCH-ERP",
    productName: "School ERP",
    shortName: "SCL",
    description: "Admissions, students, fee billing, staff, attendance and academic administration.",
    status: PRODUCT_STATUS.ACTIVE,
    version: "1.4.0",
    trialAvailable: true,
    isActive: true,
    path: "/products/school",
    dataScope: "tenant_school_operations",
    plans: {
      monthly: 3999,
      quarterly: 10999,
      halfYearly: 19999,
      yearly: 34999,
      lifetime: 199999,
    },
  },
  {
    id: COLLEGE_ERP,
    productCode: "CLG-ERP",
    productName: "College ERP",
    shortName: "CLG",
    description: "Higher education ERP for departments, admissions, exams, staff and student lifecycle.",
    status: PRODUCT_STATUS.ACTIVE,
    version: "1.2.0",
    trialAvailable: true,
    isActive: true,
    path: "/products/college",
    dataScope: "tenant_college_operations",
    plans: {
      monthly: 5999,
      quarterly: 15999,
      halfYearly: 29999,
      yearly: 49999,
      lifetime: 249999,
    },
  },
  {
    id: PRIVATE_HOSTELS_ERP,
    productCode: "HSTL-ERP",
    productName: "Private Hostels ERP",
    shortName: "HSTL",
    description: "Hostel admissions, rooms, resident records, mess, fee collections and occupancy controls.",
    status: PRODUCT_STATUS.ACTIVE,
    version: "1.3.0",
    trialAvailable: true,
    isActive: true,
    path: "/products/private_hostels",
    dataScope: "tenant_private_hostel_operations",
    plans: {
      monthly: 2499,
      quarterly: 6999,
      halfYearly: 12999,
      yearly: 21999,
      lifetime: 129999,
    },
  },
  {
    id: INSURANCE_CRM,
    productCode: "INS-CRM",
    productName: "Insurance CRM",
    shortName: "CRM",
    description: "Lead management, policy lifecycle, renewals, claims tracking and follow-up workflows.",
    status: PRODUCT_STATUS.ACTIVE,
    version: "1.5.0",
    trialAvailable: true,
    isActive: true,
    path: "/products/insurance_crm",
    dataScope: "tenant_insurance_crm_operations",
    plans: {
      monthly: 1999,
      quarterly: 5499,
      halfYearly: 9999,
      yearly: 17999,
      lifetime: null,
    },
  },
];

export const PRODUCT_SUBSCRIPTIONS = [
  {
    id: "sub-own-chit-pro",
    customerId: "tenant-own-chit",
    tenantId: "own-chit-business",
    productId: CHIT_MANAGEMENT_ERP,
    planType: "Internal",
    billingCycle: "Lifetime",
    status: SUBSCRIPTION_STATUS.ACTIVE,
    seats: 25,
    usedSeats: 7,
    licenseKey: "VDS-MNC-OWN-0001",
    startsOn: "2024-01-01",
    expiresOn: "Lifetime",
  },
  {
    id: "sub-demo-school",
    customerId: "tenant-demo-school",
    tenantId: "demo-school-tenant",
    productId: SCHOOL_ERP,
    planType: "Trial",
    billingCycle: "Monthly",
    status: SUBSCRIPTION_STATUS.TRIAL,
    seats: 15,
    usedSeats: 8,
    licenseKey: "VDS-SCH-DEMO-0001",
    startsOn: "2024-03-10",
    expiresOn: "2024-04-10",
  },
  {
    id: "sub-demo-insurance",
    customerId: "tenant-demo-school",
    tenantId: "demo-school-tenant",
    productId: INSURANCE_CRM,
    planType: "Trial",
    billingCycle: "Monthly",
    status: SUBSCRIPTION_STATUS.TRIAL,
    seats: 10,
    usedSeats: 3,
    licenseKey: "VDS-CRM-DEMO-0001",
    startsOn: "2024-03-10",
    expiresOn: "2024-04-10",
  },
  {
    id: "sub-real-finance-crm",
    customerId: "tenant-real-finance",
    tenantId: "real-finance-innovations",
    productId: INSURANCE_CRM,
    planType: "Professional",
    billingCycle: "Yearly",
    status: SUBSCRIPTION_STATUS.ACTIVE,
    seats: 50,
    usedSeats: 42,
    licenseKey: "VDS-CRM-REAL-2041",
    startsOn: "2024-02-20",
    expiresOn: "2025-02-19",
  },
  {
    id: "sub-real-hostel",
    customerId: "tenant-real-hospital",
    tenantId: "real-care-plus-hospital",
    productId: PRIVATE_HOSTELS_ERP,
    planType: "Enterprise",
    billingCycle: "Yearly",
    status: SUBSCRIPTION_STATUS.ACTIVE,
    seats: 100,
    usedSeats: 64,
    licenseKey: "VDS-HSTL-REAL-1044",
    startsOn: "2024-04-05",
    expiresOn: "2025-04-04",
  },
];

export function formatPlanPrice(amount) {
  if (!amount) return "Optional";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getProductById(productId) {
  return PRODUCT_CATALOG.find((product) => product.id === productId) || null;
}

export function getCustomerByWorkspace(activeWorkspace) {
  if (!activeWorkspace) return null;

  return CUSTOMER_ACCESS_SEED.find(
    (customer) =>
      customer.id === activeWorkspace.customerId ||
      customer.tenantId === activeWorkspace.tenantId ||
      customer.tenantId === activeWorkspace.tenant_id
  ) || null;
}

export function getSubscriptionsForTenant(activeWorkspace) {
  const tenantId = activeWorkspace?.tenantId || activeWorkspace?.tenant_id;
  const customerId = activeWorkspace?.customerId;

  return PRODUCT_SUBSCRIPTIONS.filter(
    (subscription) =>
      subscription.customerId === customerId || subscription.tenantId === tenantId
  );
}

export function getSubscriptionForProduct(productId, activeWorkspace) {
  return getSubscriptionsForTenant(activeWorkspace).find(
    (subscription) => subscription.productId === productId
  ) || null;
}

export function isSubscriptionUsable(subscription) {
  return [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL].includes(
    subscription?.status
  );
}

export function hasActiveProductSubscription(productId, activeWorkspace) {
  return isSubscriptionUsable(getSubscriptionForProduct(productId, activeWorkspace));
}

export function getProductsWithSubscriptionState(activeWorkspace, { platformOwner = false } = {}) {
  return PRODUCT_CATALOG.map((product) => {
    const subscription = getSubscriptionForProduct(product.id, activeWorkspace);
    const subscribed = isSubscriptionUsable(subscription);

    return {
      ...product,
      name: product.productName,
      icon: product.shortName,
      subscribed,
      locked: !platformOwner && !subscribed,
      subscription,
      licenseStatus: subscription?.status || SUBSCRIPTION_STATUS.NONE,
    };
  });
}

export function getSubscriptionRows() {
  return PRODUCT_SUBSCRIPTIONS.map((subscription) => {
    const product = getProductById(subscription.productId);
    const customer = CUSTOMER_ACCESS_SEED.find(
      (item) => item.id === subscription.customerId
    );

    return {
      ...subscription,
      customerName: customer?.name || subscription.customerId,
      productName: product?.productName || subscription.productId,
      productCode: product?.productCode || "-",
      seatsUsage: `${subscription.usedSeats}/${subscription.seats}`,
    };
  });
}

export function getLicenseRows() {
  return getSubscriptionRows().map((subscription) => ({
    id: subscription.id,
    company: subscription.customerName,
    product: subscription.productName,
    productCode: subscription.productCode,
    licenseKey: subscription.licenseKey,
    plan: subscription.planType,
    seats: subscription.seats,
    used: subscription.usedSeats,
    expiry: subscription.expiresOn,
    status: subscription.status,
  }));
}
