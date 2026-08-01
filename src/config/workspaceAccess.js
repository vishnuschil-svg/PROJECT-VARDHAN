import {
  CUSTOMER_ACCESS_LABELS,
  CUSTOMER_ACCESS_SEED,
  CUSTOMER_DATA_SCOPES,
  CUSTOMER_TYPES,
  WEBSITE_ACCESS_LABELS,
} from "./customerAccess";

export const WORKSPACE_TYPES = {
  MY_BUSINESS: "my_business",
  DEMO_CUSTOMERS: "demo_customers",
  PAID_CUSTOMERS: "paid_customers",
};

function toWorkspace(customer, type, label) {
  const tenantId = customer?.tenantId || null;
  const dataScope = customer?.dataScope || null;

  return {
    id: type,
    label,
    customerId: customer?.id || null,
    customerName: customer?.name || label,
    tenantId,
    tenant_id: tenantId,
    customerType: customer?.customerType || null,
    dataScope,
    data_scope: dataScope,
  };
}

export function getPlatformOwnerWorkspaces() {
  const ownBusiness = CUSTOMER_ACCESS_SEED.find(
    (customer) => customer.customerType === CUSTOMER_TYPES.OWN_BUSINESS
  );
  const demoCustomer = CUSTOMER_ACCESS_SEED.find(
    (customer) => customer.customerType === CUSTOMER_TYPES.DEMO_CUSTOMER
  );
  const paidCustomer = CUSTOMER_ACCESS_SEED.find(
    (customer) =>
      customer.customerType === CUSTOMER_TYPES.REAL_BUSINESS_CUSTOMER
  );

  return [
    toWorkspace(
      ownBusiness,
      WORKSPACE_TYPES.MY_BUSINESS,
      WEBSITE_ACCESS_LABELS.MY_BUSINESS
    ),
    toWorkspace(
      demoCustomer,
      WORKSPACE_TYPES.DEMO_CUSTOMERS,
      "Demo Customers"
    ),
    toWorkspace(
      paidCustomer,
      WORKSPACE_TYPES.PAID_CUSTOMERS,
      "Paid Customers"
    ),
  ];
}

export function getCustomerWorkspace(company) {
  const declaredScope = company?.data_scope || company?.dataScope || null;
  const isDemo =
    company?.tenant_type === CUSTOMER_TYPES.DEMO_CUSTOMER ||
    declaredScope === CUSTOMER_DATA_SCOPES.DEMO_SANDBOX;
  const isOwnBusiness =
    company?.tenant_type === CUSTOMER_TYPES.OWN_BUSINESS ||
    declaredScope === CUSTOMER_DATA_SCOPES.OWN_BUSINESS;
  const customerType = isDemo
    ? CUSTOMER_TYPES.DEMO_CUSTOMER
    : isOwnBusiness
      ? CUSTOMER_TYPES.OWN_BUSINESS
      : CUSTOMER_TYPES.REAL_BUSINESS_CUSTOMER;
  const tenantId = company?.tenant_id || company?.id || null;
  const dataScope =
    declaredScope ||
    (isDemo
      ? CUSTOMER_DATA_SCOPES.DEMO_SANDBOX
      : CUSTOMER_DATA_SCOPES.REAL_TENANT);
  const workspaceId = company?.workspace_id || company?.workspaceId || null;

  return {
    id:
      workspaceId ||
      (isDemo
        ? WORKSPACE_TYPES.DEMO_CUSTOMERS
        : WORKSPACE_TYPES.PAID_CUSTOMERS),
    workspace_id: workspaceId,
    workspaceId,
    label: CUSTOMER_ACCESS_LABELS[customerType],
    customerId: company?.customer_id || company?.id || null,
    customerName:
      company?.company_name ||
      company?.full_name ||
      "Customer Workspace",
    tenantId,
    tenant_id: tenantId,
    customerType,
    dataScope,
    data_scope: dataScope,
  };
}
