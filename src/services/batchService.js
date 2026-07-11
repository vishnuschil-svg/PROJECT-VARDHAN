import { Batch } from "../domain/chit/entities/Batch.js";
import { BatchRepository } from "../repositories/BatchRepository.js";

export function listBatches(activeTenantContext) {
  return BatchRepository.list(activeTenantContext);
}

export function saveBatch(input, activeTenantContext) {
  return BatchRepository.save(new Batch(input).toJSON(), activeTenantContext);
}

export function archiveBatch(id, activeTenantContext) {
  return BatchRepository.archive(id, activeTenantContext);
}

export function getBatchSummary({ batch, groups = [], collections = [], expenses = [] } = {}) {
  const groupIds = new Set(batch?.groupIds || batch?.group_ids || []);
  const batchGroups = groups.filter((group) => groupIds.has(group.id));
  const batchCollections = collections.filter((row) => groupIds.has(row.group_id || row.chit_group_id));
  const batchExpenses = expenses.filter((row) => row.batchId === batch?.id || row.batch_id === batch?.id);
  const collectionTotal = sum(batchCollections, "paid_amount");
  const expenseTotal = sum(batchExpenses, "amount");
  return {
    groupCount: batchGroups.length,
    collectionTotal,
    pending: sum(batchCollections, "pending_amount"),
    profit: collectionTotal - expenseTotal,
    progress: batchGroups.length ? Math.round((batchCollections.length / Math.max(1, batchGroups.length)) * 100) : 0,
  };
}

function sum(rows, field) {
  return rows.reduce((total, row) => total + Number(row[field] || 0), 0);
}
