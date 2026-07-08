import { CUSTOMER_DATA_SCOPES } from "./customerAccess";
import {
  ORGANIZATION_BRANCHES,
  ORGANIZATION_COMPANIES,
  ORGANIZATION_DEPARTMENTS,
  ORGANIZATION_DESIGNATIONS,
  ORGANIZATION_STATUS_VARIANTS,
  getVisibleOrganizationRecords,
} from "./organizationAccess";

const OWN_COMPANY = ORGANIZATION_COMPANIES.find(
  (company) => company.id === "company-own-chit"
);
const DEMO_COMPANY = ORGANIZATION_COMPANIES.find(
  (company) => company.id === "company-demo-school"
);
const FINANCE_COMPANY = ORGANIZATION_COMPANIES.find(
  (company) => company.id === "company-finance"
);
const HOSPITAL_COMPANY = ORGANIZATION_COMPANIES.find(
  (company) => company.id === "company-hospital"
);

function getOrgRefs(companyId, branchId, departmentId, designationId) {
  const company = ORGANIZATION_COMPANIES.find((item) => item.id === companyId);
  const branch = ORGANIZATION_BRANCHES.find((item) => item.id === branchId);
  const department = ORGANIZATION_DEPARTMENTS.find(
    (item) => item.id === departmentId
  );
  const designation = ORGANIZATION_DESIGNATIONS.find(
    (item) => item.id === designationId
  );

  return { company, branch, department, designation };
}

export const EMPLOYEE_STATUS_VARIANTS = ORGANIZATION_STATUS_VARIANTS;

export const EMPLOYEE_ACCESS_SEED = [
  {
    id: "emp-own-001",
    employeeName: "Vishnu Vardhan Reddy",
    employeeCode: "EMP-OWN-001",
    companyId: "company-own-chit",
    branchId: "branch-own-main",
    departmentId: "dept-own-collections",
    designationId: "desig-own-manager",
    mobileNumber: "+91 9000000000",
    email: "owner@vardhanerp.com",
    joiningDate: "2024-01-01",
    status: "active",
    tenantId: OWN_COMPANY?.tenantId,
    customerType: OWN_COMPANY?.customerType,
    dataScope: CUSTOMER_DATA_SCOPES.OWN_BUSINESS,
  },
  {
    id: "emp-demo-001",
    employeeName: "Demo Teacher",
    employeeCode: "EMP-DMO-001",
    companyId: "company-demo-school",
    branchId: "branch-demo-school-main",
    departmentId: "dept-demo-academics",
    designationId: "desig-demo-teacher",
    mobileNumber: "+91 9888888888",
    email: "teacher.demo@vardhanerp.com",
    joiningDate: "2024-03-10",
    status: "setup",
    tenantId: DEMO_COMPANY?.tenantId,
    customerType: DEMO_COMPANY?.customerType,
    dataScope: CUSTOMER_DATA_SCOPES.DEMO_SANDBOX,
  },
  {
    id: "emp-fin-001",
    employeeName: "Priya Sharma",
    employeeCode: "EMP-FIN-001",
    companyId: "company-finance",
    branchId: "branch-finance-main",
    departmentId: "dept-finance-operations",
    designationId: "desig-finance-officer",
    mobileNumber: "+91 8765432109",
    email: "priya@financeinno.com",
    joiningDate: "2024-02-20",
    status: "active",
    tenantId: FINANCE_COMPANY?.tenantId,
    customerType: FINANCE_COMPANY?.customerType,
    dataScope: CUSTOMER_DATA_SCOPES.REAL_TENANT,
  },
  {
    id: "emp-hos-001",
    employeeName: "Dr. Arun Kumar",
    employeeCode: "EMP-HOS-001",
    companyId: "company-hospital",
    branchId: "branch-hospital-main",
    departmentId: "dept-hospital-admin",
    designationId: "desig-hospital-admin",
    mobileNumber: "+91 9876543210",
    email: "arun@careplus.example",
    joiningDate: "2024-04-05",
    status: "active",
    tenantId: HOSPITAL_COMPANY?.tenantId,
    customerType: HOSPITAL_COMPANY?.customerType,
    dataScope: CUSTOMER_DATA_SCOPES.REAL_TENANT,
  },
].map(enrichEmployee);

export function enrichEmployee(employee) {
  const { company, branch, department, designation } = getOrgRefs(
    employee.companyId,
    employee.branchId,
    employee.departmentId,
    employee.designationId
  );

  return {
    ...employee,
    companyName: company?.companyName || "",
    branchName: branch?.branchName || "",
    departmentName: department?.departmentName || "",
    designationName: designation?.designationName || "",
    tenantId: employee.tenantId || company?.tenantId,
    customerType: employee.customerType || company?.customerType,
    dataScope: employee.dataScope || company?.dataScope,
  };
}

export function getVisibleEmployees(employees, profile, role, company, isOwner) {
  return getVisibleOrganizationRecords(employees, profile, role, company, isOwner);
}
