import { listScopedRows, upsertScopedRow } from "./scopedStorageRepository.js";

const INVESTOR_KEY = "vardhan.chit.investors.v1";
const TRANSACTION_KEY = "vardhan.chit.investorTransactions.v1";

export const InvestorRepository = {
  list(activeTenantContext) {
    return listScopedRows(INVESTOR_KEY, activeTenantContext);
  },
  save(investor, activeTenantContext) {
    return upsertScopedRow(INVESTOR_KEY, investor, activeTenantContext, "investor");
  },
  listTransactions(activeTenantContext) {
    return listScopedRows(TRANSACTION_KEY, activeTenantContext);
  },
  saveTransaction(transaction, activeTenantContext) {
    return upsertScopedRow(TRANSACTION_KEY, transaction, activeTenantContext, "investor-transaction");
  },
};
