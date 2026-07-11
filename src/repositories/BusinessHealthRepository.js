import {
  CollectionsRepository,
  FinanceRepository,
  GroupsRepository,
  MembersRepository,
  getTenantScope,
} from "./chits/index.js";
import { WorkspaceRepository } from "./WorkspaceRepository.js";

const MAX_PAGE_SIZE = Number.MAX_SAFE_INTEGER;

export const BusinessHealthRepository = {
  getSnapshot(activeTenantContext) {
    const tenantContext = activeTenantContext || WorkspaceRepository.getCurrentWorkspaceContext();

    return {
      groups: listRepositoryRows(GroupsRepository, tenantContext),
      members: listRepositoryRows(MembersRepository, tenantContext),
      collections: listRepositoryRows(CollectionsRepository, tenantContext),
      financeEntries: listRepositoryRows(FinanceRepository, tenantContext),
    };
  },
};

function listRepositoryRows(repository, activeTenantContext) {
  if (!getTenantScope(activeTenantContext).scope_key) {
    return [];
  }

  return repository.list({
    activeTenantContext,
    pageSize: MAX_PAGE_SIZE,
  }).data;
}
