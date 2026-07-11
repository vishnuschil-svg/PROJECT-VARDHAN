import {
  AuctionRepository,
  CollectionsRepository,
  FinanceRepository,
  GroupsRepository,
  MembersRepository,
  ReceiptsRepository,
  ReportsRepository,
  getTenantScope,
} from "./chits/index.js";
import { WorkspaceRepository } from "./WorkspaceRepository.js";

const MAX_PAGE_SIZE = Number.MAX_SAFE_INTEGER;

export const ChitLifecycleRepository = {
  getLifecycleSource(activeTenantContext) {
    const tenantContext = activeTenantContext || WorkspaceRepository.getCurrentWorkspaceContext();

    return {
      tenantContext,
      groups: listRows(GroupsRepository, tenantContext),
      members: listRows(MembersRepository, tenantContext),
      collections: listRows(CollectionsRepository, tenantContext),
      auctions: listRows(AuctionRepository, tenantContext),
      receipts: listRows(ReceiptsRepository, tenantContext),
      financeEntries: listRows(FinanceRepository, tenantContext),
      savedReports: listRows(ReportsRepository, tenantContext),
    };
  },
};

function listRows(repository, activeTenantContext) {
  if (!getTenantScope(activeTenantContext).scope_key) {
    return [];
  }

  return repository.list({
    activeTenantContext,
    pageSize: MAX_PAGE_SIZE,
  }).data;
}
