import { AuctionRepository as ChitAuctionRepository } from "./chits/index.js";

export const AuctionRepository = {
  list(activeTenantContext) {
    return ChitAuctionRepository.list({ activeTenantContext, pageSize: Number.MAX_SAFE_INTEGER }).data;
  },
  save(record, activeTenantContext) {
    return ChitAuctionRepository.upsert(record, { activeTenantContext });
  },
  cancel(id, patch, activeTenantContext) {
    return ChitAuctionRepository.update(id, patch, { activeTenantContext });
  },
};
