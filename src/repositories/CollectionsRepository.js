import {
  CollectionsRepository as ChitCollectionsRepository,
  FinanceRepository,
  ReceiptsRepository,
  ReportsRepository,
} from "./chits";

const STORE_EVENT = "vardhan:chit-collections-changed";

export const CollectionsRepository = {
  getSource(activeTenantContext) {
    return {
      collections: this.listCollections(activeTenantContext),
      receipts: this.listReceipts(activeTenantContext),
    };
  },

  listCollections(activeTenantContext) {
    return ChitCollectionsRepository.list({
      activeTenantContext,
      pageSize: Number.MAX_SAFE_INTEGER,
    }).data;
  },

  listReceipts(activeTenantContext) {
    return ReceiptsRepository.list({
      activeTenantContext,
      pageSize: Number.MAX_SAFE_INTEGER,
    }).data;
  },

  saveCollection(collection, activeTenantContext) {
    const savedCollection = ChitCollectionsRepository.upsert(collection, { activeTenantContext });
    notifyCollectionsChanged();

    return savedCollection;
  },

  saveReceipt(receipt, activeTenantContext) {
    return ReceiptsRepository.upsert(receipt, { activeTenantContext });
  },

  saveFinanceEntry(entry, activeTenantContext) {
    return FinanceRepository.upsert(entry, { activeTenantContext });
  },

  saveReportEntry(report, activeTenantContext) {
    return ReportsRepository.upsert(report, { activeTenantContext });
  },
};

function notifyCollectionsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(STORE_EVENT));
  }
}
