import {
  ORGANIZATION_BRANCHES,
  ORGANIZATION_STATUS_VARIANTS,
  canViewOrganizationRecord,
} from "./organizationAccess";

export const BRANCH_STATUS_VARIANTS = ORGANIZATION_STATUS_VARIANTS;

export const BRANCH_ACCESS_SEED = ORGANIZATION_BRANCHES.map((branch) => ({
  ...branch,
  customerName: branch.companyName,
  branchManager: branch.manager,
  contactNumber: branch.contact,
}));

export function canViewBranch(viewerCustomer, branch) {
  return canViewOrganizationRecord(viewerCustomer, branch);
}
