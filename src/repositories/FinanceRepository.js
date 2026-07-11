import { AuctionRepository } from "./chits/AuctionRepository.js";
import { CollectionsRepository } from "./chits/CollectionsRepository.js";
import { FinanceRepository as ChitFinanceRepository } from "./chits/FinanceRepository.js";
import { getTenantScope } from "./chits/repositoryContracts.js";
import { WorkspaceRepository } from "./WorkspaceRepository.js";

const MAX_PAGE_SIZE = Number.MAX_SAFE_INTEGER;

export const FinanceRepository = {
  getFinanceSource(activeTenantContext) {
    const context = activeTenantContext || null;

    return {
      activeTenantContext: context,
      financeEntries: listRepositoryRows(ChitFinanceRepository, context),
      collections: listRepositoryRows(CollectionsRepository, context),
      auctions: listRepositoryRows(AuctionRepository, context),
    };
  },

  listTransactions(activeTenantContext) {
    return this.getFinanceSource(activeTenantContext).financeEntries;
  },

  saveTransaction(transaction, activeTenantContext) {
    const context = activeTenantContext || WorkspaceRepository.getCurrentWorkspaceContext();
    return ChitFinanceRepository.upsert(transaction, { activeTenantContext: context });
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
