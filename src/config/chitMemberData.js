import { CUSTOMER_DATA_SCOPES } from "./customerAccess";

export const MEMBER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
};

export const MEMBER_STATUS_VARIANTS = {
  active: "success",
  inactive: "default",
  suspended: "warning",
};

export const PHASE_TWO_CHIT_MEMBERS = [
  {
    id: "member-own-001",
    tenant_id: "own-chit-business",
    data_scope: CUSTOMER_DATA_SCOPES.OWN_BUSINESS,
    member_name: "Ramesh Kumar",
    member_number: "MNCP-OWN-001",
    mobile_number: "9876543210",
    whatsapp_number: "9876543210",
    email: "ramesh.kumar@example.com",
    address: "12 Market Road, Vijayawada",
    aadhaar_masked: "XXXX-XXXX-4321",
    pan: "ABCDE1234F",
    nominee_name: "Lakshmi Kumar",
    nominee_mobile: "9876500001",
    bank_name: "State Bank of India",
    account_number_masked: "XXXXXX7890",
    ifsc: "SBIN0001234",
    chit_group_id: "own-chit-001",
    join_date: "2026-01-05",
    status: MEMBER_STATUS.ACTIVE,
  },
  {
    id: "member-own-002",
    tenant_id: "own-chit-business",
    data_scope: CUSTOMER_DATA_SCOPES.OWN_BUSINESS,
    member_name: "Sravani Reddy",
    member_number: "MNCP-OWN-002",
    mobile_number: "9123456780",
    whatsapp_number: "9123456780",
    email: "sravani.reddy@example.com",
    address: "48 Temple Street, Guntur",
    aadhaar_masked: "XXXX-XXXX-2256",
    pan: "PQRSX4567L",
    nominee_name: "Madhav Reddy",
    nominee_mobile: "9123400002",
    bank_name: "HDFC Bank",
    account_number_masked: "XXXXXX2345",
    ifsc: "HDFC0000456",
    chit_group_id: "own-chit-001",
    join_date: "2026-01-10",
    status: MEMBER_STATUS.ACTIVE,
  },
  {
    id: "member-own-003",
    tenant_id: "own-chit-business",
    data_scope: CUSTOMER_DATA_SCOPES.OWN_BUSINESS,
    member_name: "Kiran Babu",
    member_number: "MNCP-OWN-003",
    mobile_number: "9988776655",
    whatsapp_number: "9988776655",
    email: "",
    address: "7 Ring Road, Tenali",
    aadhaar_masked: "XXXX-XXXX-8842",
    pan: "",
    nominee_name: "Anitha Babu",
    nominee_mobile: "9988700003",
    bank_name: "Axis Bank",
    account_number_masked: "XXXXXX9812",
    ifsc: "UTIB0000789",
    chit_group_id: "own-chit-002",
    join_date: "2026-03-12",
    status: MEMBER_STATUS.ACTIVE,
  },
  {
    id: "member-demo-001",
    tenant_id: "demo-school-tenant",
    data_scope: CUSTOMER_DATA_SCOPES.DEMO_SANDBOX,
    member_name: "Demo Member One",
    member_number: "MNCP-DEMO-001",
    mobile_number: "9000000001",
    whatsapp_number: "9000000001",
    email: "demo.member@example.com",
    address: "Demo Sandbox Address",
    aadhaar_masked: "XXXX-XXXX-1001",
    pan: "DEMOA1001D",
    nominee_name: "Demo Nominee",
    nominee_mobile: "9000000002",
    bank_name: "Demo Bank",
    account_number_masked: "XXXXXX1001",
    ifsc: "DEMO0001001",
    chit_group_id: "demo-chit-001",
    join_date: "2026-06-10",
    status: MEMBER_STATUS.ACTIVE,
  },
  {
    id: "member-paid-001",
    tenant_id: "real-finance-innovations",
    data_scope: CUSTOMER_DATA_SCOPES.REAL_TENANT,
    member_name: "Naveen Sharma",
    member_number: "MNCP-PAID-001",
    mobile_number: "9445566778",
    whatsapp_number: "9445566778",
    email: "naveen.sharma@example.com",
    address: "22 Finance Park, Hyderabad",
    aadhaar_masked: "XXXX-XXXX-5609",
    pan: "LMNOP9876Q",
    nominee_name: "Preethi Sharma",
    nominee_mobile: "9445500001",
    bank_name: "ICICI Bank",
    account_number_masked: "XXXXXX4567",
    ifsc: "ICIC0000456",
    chit_group_id: "paid-chit-001",
    join_date: "2026-02-08",
    status: MEMBER_STATUS.ACTIVE,
  },
];

export function getTenantMembers(members, activeTenantContext) {
  if (!activeTenantContext?.tenant_id || !activeTenantContext?.data_scope) {
    return [];
  }

  return members.filter(
    (member) =>
      member.tenant_id === activeTenantContext.tenant_id &&
      member.data_scope === activeTenantContext.data_scope
  );
}

export function getMemberSummary(members, groups) {
  return {
    total_members: members.length,
    active_members: members.filter((member) => member.status === MEMBER_STATUS.ACTIVE).length,
    inactive_members: members.filter((member) => member.status === MEMBER_STATUS.INACTIVE).length,
    assigned_groups: new Set(members.map((member) => member.chit_group_id).filter(Boolean)).size,
    available_groups: groups.length,
  };
}

export function getMemberGroupName(member, groups) {
  return groups.find((group) => group.id === member.chit_group_id)?.chit_name || "Unassigned";
}

export function maskAadhaarNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  const lastFour = digits.slice(-4).padStart(4, "X");
  return `XXXX-XXXX-${lastFour}`;
}

export function maskAccountNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  const lastFour = digits.slice(-4).padStart(4, "X");
  return `XXXXXX${lastFour}`;
}

export function getNextMemberNumber(members) {
  return `MNCP-${String(members.length + 1).padStart(3, "0")}`;
}
