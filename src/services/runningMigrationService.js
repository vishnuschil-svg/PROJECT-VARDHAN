import { MigrationRepository } from "../repositories/MigrationRepository.js";

export function previewRunningMigration(input = {}) {
  const batchId = input.batchId || `migration-${Date.now()}`;
  const records = [
    ...(input.schedule || []).map((row) => markMigrated(row, batchId, "schedule")),
    ...(input.members || []).map((row) => markMigrated(row, batchId, "member")),
    ...(input.collections || []).map((row) => markMigrated(row, batchId, "collection")),
    ...(input.receipts || []).map((row) => markMigrated(row, batchId, "receipt")),
    ...(input.winners || []).map((row) => markMigrated(row, batchId, "winner")),
  ];
  const totalCollections = sum(input.collections, (row) => row.paid_amount || row.amount);
  const totalReceipts = sum(input.receipts, (row) => row.amount || row.amountPaid);
  return {
    batchId,
    mode: input.mode || "OPENING_BALANCE_MIGRATION",
    currentMonth: Number(input.currentMonth || 1),
    records,
    reconciliation: {
      status: Math.abs(totalCollections - totalReceipts) < 0.01 ? "PASS" : "FAIL",
      collectionTotal: totalCollections,
      receiptTotal: totalReceipts,
    },
    canConfirm: Math.abs(totalCollections - totalReceipts) < 0.01,
  };
}

export function confirmRunningMigration(input = {}, activeTenantContext) {
  const preview = previewRunningMigration(input);
  if (!preview.canConfirm) return { success: false, preview, message: "Migration reconciliation must pass before confirmation." };
  return { success: true, batch: MigrationRepository.save({ ...preview, status: "CONFIRMED", confirmedAt: new Date().toISOString() }, activeTenantContext) };
}

function markMigrated(row, batchId, type) {
  return {
    ...row,
    recordType: type,
    batchId,
    migrated: true,
    source: row.source || "OWNER_IMPORT",
    originalReference: row.originalReference || row.id || "",
    importedAt: new Date().toISOString(),
  };
}

function sum(rows = [], getter) {
  return rows.reduce((total, row) => total + Number(getter(row) || 0), 0);
}
