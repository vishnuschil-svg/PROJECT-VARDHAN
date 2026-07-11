import { listScopedRows, upsertScopedRow } from "./scopedStorageRepository.js";

const STORAGE_KEY = "vardhan.chit.expenses.v1";

export const ExpenseRepository = {
  list(activeTenantContext) {
    return listScopedRows(STORAGE_KEY, activeTenantContext);
  },
  save(expense, activeTenantContext) {
    return upsertScopedRow(STORAGE_KEY, expense, activeTenantContext, "expense");
  },
};
