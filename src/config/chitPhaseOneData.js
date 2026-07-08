import { CUSTOMER_DATA_SCOPES } from "./customerAccess";

export const CHIT_GROUP_STATUS = {
  ACTIVE: "active",
  UPCOMING: "upcoming",
  CLOSED: "closed",
  ARCHIVED: "archived",
};

export const CHIT_STATUS_VARIANTS = {
  active: "success",
  upcoming: "warning",
  closed: "error",
  archived: "default",
};

export const PHASE_ONE_CHIT_GROUPS = [
  {
    id: "own-chit-001",
    tenant_id: "own-chit-business",
    data_scope: CUSTOMER_DATA_SCOPES.OWN_BUSINESS,
    chit_name: "Vardhan Gold Chit 2026",
    chit_code: "VGC-2026-01",
    chit_value: 500000,
    monthly_amount: 25000,
    total_members: 20,
    total_months: 20,
    start_date: "2026-01-01",
    end_date: "2027-08-31",
    status: CHIT_GROUP_STATUS.ACTIVE,
    today_collections: 75000,
    pending_collections: 50000,
    outstanding_amount: 425000,
    next_auction_date: "2026-07-15",
  },
  {
    id: "own-chit-002",
    tenant_id: "own-chit-business",
    data_scope: CUSTOMER_DATA_SCOPES.OWN_BUSINESS,
    chit_name: "Vardhan Silver Chit 2026",
    chit_code: "VSC-2026-02",
    chit_value: 200000,
    monthly_amount: 10000,
    total_members: 20,
    total_months: 20,
    start_date: "2026-03-01",
    end_date: "2027-10-31",
    status: CHIT_GROUP_STATUS.ACTIVE,
    today_collections: 30000,
    pending_collections: 20000,
    outstanding_amount: 180000,
    next_auction_date: "2026-07-20",
  },
  {
    id: "demo-chit-001",
    tenant_id: "demo-school-tenant",
    data_scope: CUSTOMER_DATA_SCOPES.DEMO_SANDBOX,
    chit_name: "Demo Staff Welfare Chit",
    chit_code: "DWC-001",
    chit_value: 100000,
    monthly_amount: 5000,
    total_members: 20,
    total_months: 20,
    start_date: "2026-06-01",
    end_date: "2028-01-31",
    status: CHIT_GROUP_STATUS.UPCOMING,
    today_collections: 0,
    pending_collections: 0,
    outstanding_amount: 100000,
    next_auction_date: "2026-08-05",
  },
  {
    id: "paid-chit-001",
    tenant_id: "real-finance-innovations",
    data_scope: CUSTOMER_DATA_SCOPES.REAL_TENANT,
    chit_name: "Finance Monthly Chit",
    chit_code: "FMC-001",
    chit_value: 300000,
    monthly_amount: 15000,
    total_members: 20,
    total_months: 20,
    start_date: "2026-02-01",
    end_date: "2027-09-30",
    status: CHIT_GROUP_STATUS.ACTIVE,
    today_collections: 45000,
    pending_collections: 15000,
    outstanding_amount: 255000,
    next_auction_date: "2026-07-18",
  },
];

export function getTenantChitGroups(groups, activeTenantContext) {
  if (!activeTenantContext?.tenant_id || !activeTenantContext?.data_scope) {
    return [];
  }

  return groups.filter(
    (group) =>
      group.tenant_id === activeTenantContext.tenant_id &&
      group.data_scope === activeTenantContext.data_scope
  );
}

export function calculateChitDashboardStats(groups) {
  const activeGroups = groups.filter((group) => group.status === CHIT_GROUP_STATUS.ACTIVE);

  return {
    total_active_chits: activeGroups.length,
    total_members: activeGroups.reduce((sum, group) => sum + Number(group.total_members || 0), 0),
    todays_collections: groups.reduce((sum, group) => sum + Number(group.today_collections || 0), 0),
    pending_collections: groups.reduce((sum, group) => sum + Number(group.pending_collections || 0), 0),
    upcoming_auctions: groups.filter(
      (group) =>
        group.next_auction_date &&
        group.status !== CHIT_GROUP_STATUS.CLOSED &&
        group.status !== CHIT_GROUP_STATUS.ARCHIVED
    ).length,
    monthly_business: activeGroups.reduce(
      (sum, group) => sum + Number(group.monthly_amount || 0) * Number(group.total_members || 0),
      0
    ),
    outstanding_amount: groups.reduce((sum, group) => sum + Number(group.outstanding_amount || 0), 0),
  };
}

export function formatCurrency(value) {
  return `Rs ${Number(value || 0).toLocaleString("en-IN")}`;
}

export function getNextGroupCode(groups) {
  return `CHIT-${String(groups.length + 1).padStart(3, "0")}`;
}
