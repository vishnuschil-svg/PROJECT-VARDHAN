import {
  CUSTOMER_ACCESS_SEED,
  CUSTOMER_DATA_SCOPES,
  CUSTOMER_TYPES,
} from "./customerAccess";

const OWN_BUSINESS = CUSTOMER_ACCESS_SEED.find(
  (customer) => customer.customerType === CUSTOMER_TYPES.OWN_BUSINESS
);
const DEMO_CUSTOMER = CUSTOMER_ACCESS_SEED.find(
  (customer) => customer.customerType === CUSTOMER_TYPES.DEMO_CUSTOMER
);
const FINANCE_CUSTOMER = CUSTOMER_ACCESS_SEED.find(
  (customer) => customer.id === "tenant-real-finance"
);
const HOSPITAL_CUSTOMER = CUSTOMER_ACCESS_SEED.find(
  (customer) => customer.id === "tenant-real-hospital"
);

export const ORGANIZATION_STATUS_VARIANTS = {
  active: "success",
  setup: "warning",
  inactive: "error",
  approved: "success",
  pending: "warning",
};

export const ORGANIZATION_COMPANIES = [
  {
    id: "company-own-chit",
    customerId: OWN_BUSINESS?.id,
    tenantId: OWN_BUSINESS?.tenantId,
    customerType: OWN_BUSINESS?.customerType,
    dataScope: CUSTOMER_DATA_SCOPES.OWN_BUSINESS,
    companyName: "VARDHAN Own Chit Business",
    companyCode: "VOCB",
    gstNumber: "36ABCDE1234F1Z5",
    pan: "ABCDE1234F",
    address: "Hyderabad, Telangana",
    contact: "+91 9000000000",
    email: "owner@vardhanerp.com",
    logo: "VOCB",
    status: "active",
  },
  {
    id: "company-demo-school",
    customerId: DEMO_CUSTOMER?.id,
    tenantId: DEMO_CUSTOMER?.tenantId,
    customerType: DEMO_CUSTOMER?.customerType,
    dataScope: CUSTOMER_DATA_SCOPES.DEMO_SANDBOX,
    companyName: "Demo School Tenant",
    companyCode: "DMS",
    gstNumber: "",
    pan: "",
    address: "Demo City",
    contact: "+91 9888888888",
    email: "demo.school@vardhanerp.com",
    logo: "DMS",
    status: "setup",
  },
  {
    id: "company-finance",
    customerId: FINANCE_CUSTOMER?.id,
    tenantId: FINANCE_CUSTOMER?.tenantId,
    customerType: FINANCE_CUSTOMER?.customerType,
    dataScope: CUSTOMER_DATA_SCOPES.REAL_TENANT,
    companyName: "Finance Innovations",
    companyCode: "FIN",
    gstNumber: "29ABCDE5678G1Z2",
    pan: "ABCDE5678G",
    address: "Bengaluru, Karnataka",
    contact: "+91 8765432109",
    email: "info@financeinno.com",
    logo: "FIN",
    status: "active",
  },
  {
    id: "company-hospital",
    customerId: HOSPITAL_CUSTOMER?.id,
    tenantId: HOSPITAL_CUSTOMER?.tenantId,
    customerType: HOSPITAL_CUSTOMER?.customerType,
    dataScope: CUSTOMER_DATA_SCOPES.REAL_TENANT,
    companyName: "Care Plus Hospital",
    companyCode: "CPH",
    gstNumber: "33ABCDE9012H1Z8",
    pan: "ABCDE9012H",
    address: "Chennai, Tamil Nadu",
    contact: "+91 9876543210",
    email: "admin@careplus.example",
    logo: "CPH",
    status: "active",
  },
];

export const ORGANIZATION_BRANCHES = [
  {
    id: "branch-own-main",
    companyId: "company-own-chit",
    companyName: "VARDHAN Own Chit Business",
    customerId: OWN_BUSINESS?.id,
    tenantId: OWN_BUSINESS?.tenantId,
    customerType: OWN_BUSINESS?.customerType,
    dataScope: CUSTOMER_DATA_SCOPES.OWN_BUSINESS,
    branchName: "VARDHAN Chit Main Branch",
    branchCode: "VCB-001",
    manager: "Vishnu Vardhan Reddy",
    location: "Hyderabad",
    contact: "+91 9000000000",
    status: "active",
  },
  {
    id: "branch-demo-school-main",
    companyId: "company-demo-school",
    companyName: "Demo School Tenant",
    customerId: DEMO_CUSTOMER?.id,
    tenantId: DEMO_CUSTOMER?.tenantId,
    customerType: DEMO_CUSTOMER?.customerType,
    dataScope: CUSTOMER_DATA_SCOPES.DEMO_SANDBOX,
    branchName: "Demo School Main Branch",
    branchCode: "DSB-001",
    manager: "Demo Admin",
    location: "Demo City",
    contact: "+91 9888888888",
    status: "setup",
  },
  {
    id: "branch-finance-main",
    companyId: "company-finance",
    companyName: "Finance Innovations",
    customerId: FINANCE_CUSTOMER?.id,
    tenantId: FINANCE_CUSTOMER?.tenantId,
    customerType: FINANCE_CUSTOMER?.customerType,
    dataScope: CUSTOMER_DATA_SCOPES.REAL_TENANT,
    branchName: "Finance Innovations Head Office",
    branchCode: "FI-001",
    manager: "Priya Sharma",
    location: "Bengaluru",
    contact: "+91 8765432109",
    status: "active",
  },
  {
    id: "branch-hospital-main",
    companyId: "company-hospital",
    companyName: "Care Plus Hospital",
    customerId: HOSPITAL_CUSTOMER?.id,
    tenantId: HOSPITAL_CUSTOMER?.tenantId,
    customerType: HOSPITAL_CUSTOMER?.customerType,
    dataScope: CUSTOMER_DATA_SCOPES.REAL_TENANT,
    branchName: "Care Plus Central Branch",
    branchCode: "CPH-001",
    manager: "Dr. Arun Kumar",
    location: "Chennai",
    contact: "+91 9876543210",
    status: "active",
  },
];

export const ORGANIZATION_DEPARTMENTS = [
  {
    id: "dept-own-collections",
    branchId: "branch-own-main",
    branchName: "VARDHAN Chit Main Branch",
    tenantId: OWN_BUSINESS?.tenantId,
    customerType: OWN_BUSINESS?.customerType,
    dataScope: CUSTOMER_DATA_SCOPES.OWN_BUSINESS,
    departmentName: "Collections",
    departmentCode: "COL",
    status: "active",
  },
  {
    id: "dept-demo-academics",
    branchId: "branch-demo-school-main",
    branchName: "Demo School Main Branch",
    tenantId: DEMO_CUSTOMER?.tenantId,
    customerType: DEMO_CUSTOMER?.customerType,
    dataScope: CUSTOMER_DATA_SCOPES.DEMO_SANDBOX,
    departmentName: "Academics",
    departmentCode: "ACD",
    status: "setup",
  },
  {
    id: "dept-finance-operations",
    branchId: "branch-finance-main",
    branchName: "Finance Innovations Head Office",
    tenantId: FINANCE_CUSTOMER?.tenantId,
    customerType: FINANCE_CUSTOMER?.customerType,
    dataScope: CUSTOMER_DATA_SCOPES.REAL_TENANT,
    departmentName: "Finance Operations",
    departmentCode: "FOP",
    status: "active",
  },
  {
    id: "dept-hospital-admin",
    branchId: "branch-hospital-main",
    branchName: "Care Plus Central Branch",
    tenantId: HOSPITAL_CUSTOMER?.tenantId,
    customerType: HOSPITAL_CUSTOMER?.customerType,
    dataScope: CUSTOMER_DATA_SCOPES.REAL_TENANT,
    departmentName: "Administration",
    departmentCode: "ADM",
    status: "active",
  },
];

export const ORGANIZATION_DESIGNATIONS = [
  {
    id: "desig-own-manager",
    departmentId: "dept-own-collections",
    departmentName: "Collections",
    tenantId: OWN_BUSINESS?.tenantId,
    customerType: OWN_BUSINESS?.customerType,
    dataScope: CUSTOMER_DATA_SCOPES.OWN_BUSINESS,
    designationName: "Collection Manager",
    reportingLevel: 2,
    status: "active",
  },
  {
    id: "desig-demo-teacher",
    departmentId: "dept-demo-academics",
    departmentName: "Academics",
    tenantId: DEMO_CUSTOMER?.tenantId,
    customerType: DEMO_CUSTOMER?.customerType,
    dataScope: CUSTOMER_DATA_SCOPES.DEMO_SANDBOX,
    designationName: "Class Teacher",
    reportingLevel: 3,
    status: "setup",
  },
  {
    id: "desig-finance-officer",
    departmentId: "dept-finance-operations",
    departmentName: "Finance Operations",
    tenantId: FINANCE_CUSTOMER?.tenantId,
    customerType: FINANCE_CUSTOMER?.customerType,
    dataScope: CUSTOMER_DATA_SCOPES.REAL_TENANT,
    designationName: "Finance Officer",
    reportingLevel: 3,
    status: "active",
  },
  {
    id: "desig-hospital-admin",
    departmentId: "dept-hospital-admin",
    departmentName: "Administration",
    tenantId: HOSPITAL_CUSTOMER?.tenantId,
    customerType: HOSPITAL_CUSTOMER?.customerType,
    dataScope: CUSTOMER_DATA_SCOPES.REAL_TENANT,
    designationName: "Hospital Administrator",
    reportingLevel: 2,
    status: "active",
  },
];

export function getCurrentTenantId(profile, company) {
  return company?.tenant_id || company?.id || profile?.tenant_id || profile?.company_id;
}

export function getViewerCustomer(profile, company) {
  const currentTenantId = getCurrentTenantId(profile, company);

  return CUSTOMER_ACCESS_SEED.find(
    (customer) =>
      customer.tenantId === currentTenantId || customer.id === currentTenantId
  );
}

export function canViewOrganizationRecord(viewerCustomer, record) {
  if (!viewerCustomer || !record) {
    return false;
  }

  if (viewerCustomer.customerType === CUSTOMER_TYPES.DEMO_CUSTOMER) {
    return (
      record.customerType === CUSTOMER_TYPES.DEMO_CUSTOMER &&
      record.dataScope === CUSTOMER_DATA_SCOPES.DEMO_SANDBOX &&
      record.tenantId === viewerCustomer.tenantId
    );
  }

  return record.tenantId === viewerCustomer.tenantId;
}

export function getVisibleOrganizationRecords(records, profile, role, company, isOwner) {
  if (isOwner(profile, role)) {
    return records;
  }

  const viewerCustomer = getViewerCustomer(profile, company);
  return records.filter((record) =>
    canViewOrganizationRecord(viewerCustomer, record)
  );
}
