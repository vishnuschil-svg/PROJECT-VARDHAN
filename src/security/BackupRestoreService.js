import { decryptJSON, encryptJSON, sha256Hex } from "./EncryptionService.js";

export const BACKUP_FORMAT_VERSION = "VARDHAN-TENANT-BACKUP-v2";
const LEGACY_BACKUP_FORMAT_VERSION = "VARDHAN-TENANT-BACKUP-v1";
const AUDIT_GENESIS_HASH = "0".repeat(64);

export async function createEncryptedBackup({ tenantContext, datasets, secret, createdAt = new Date().toISOString() } = {}) {
  const scope = normalizeScope(tenantContext);
  const records = normalizeDatasets(datasets, scope);
  const manifest = {
    format: BACKUP_FORMAT_VERSION,
    tenantId: scope.tenantId,
    dataScope: scope.dataScope,
    workspaceId: scope.workspaceId || null,
    createdAt,
    checksumAlgorithm: "SHA-256",
    recordsChecksum: await sha256Hex(records),
    datasetCounts: Object.fromEntries(Object.entries(records).map(([name, rows]) => [name, rows.length])),
  };
  return { manifest, payload: await encryptJSON({ manifest, records }, secret) };
}

export async function exportTenantBackup({ tenantContext, repositories, secret, createdAt } = {}) {
  const scope = normalizeScope(tenantContext);
  assertRepositoryMap(repositories);
  const datasets = {};
  for (const [name, repository] of Object.entries(repositories)) {
    const list = repository.exportTenant || repository.list || repository.snapshot;
    if (typeof list !== "function") throw new Error(`Backup repository ${name} does not support tenant export.`);
    datasets[name] = await list.call(repository, toTenantContext(scope));
  }
  return createEncryptedBackup({ tenantContext: toTenantContext(scope), datasets, secret, createdAt });
}

export async function buildRestorePlan({ backup, tenantContext, secret, repositories } = {}) {
  const scope = normalizeScope(tenantContext);
  if (![BACKUP_FORMAT_VERSION, LEGACY_BACKUP_FORMAT_VERSION].includes(backup?.manifest?.format)) throw new Error("Unsupported backup format.");
  const decoded = await decryptJSON(backup.payload, secret);
  if (canonicalStringify(decoded.manifest) !== canonicalStringify(backup.manifest)) throw new Error("Backup manifest authentication failed.");
  if (decoded.manifest.tenantId !== scope.tenantId || decoded.manifest.dataScope !== scope.dataScope) {
    throw new Error("Backup belongs to a different tenant or data scope.");
  }
  if (decoded.manifest.workspaceId && decoded.manifest.workspaceId !== scope.workspaceId) throw new Error("Backup belongs to a different workspace.");
  const records = normalizeDatasets(decoded.records, scope);
  const errors = validateCounts(decoded.manifest.datasetCounts, records);
  const warnings = [];
  if (decoded.manifest.format === BACKUP_FORMAT_VERSION) {
    const checksum = await sha256Hex(records);
    if (checksum !== decoded.manifest.recordsChecksum) errors.push("Backup record checksum verification failed.");
  } else {
    warnings.push("Legacy v1 backup has authenticated encryption but no independent record checksum.");
  }
  if (repositories) {
    for (const name of Object.keys(records)) {
      const repository = repositories[name];
      if (!repository || typeof (repository.restoreTenant || repository.restore) !== "function") errors.push(`Restore repository ${name} is unavailable.`);
    }
  }
  return deepFreeze({
    status: errors.length ? "INVALID" : "READY_FOR_OWNER_CONFIRMATION",
    tenantId: scope.tenantId,
    dataScope: scope.dataScope,
    checksumVerified: decoded.manifest.format === BACKUP_FORMAT_VERSION && errors.every((error) => !error.includes("checksum")),
    datasetCounts: { ...decoded.manifest.datasetCounts },
    records,
    errors,
    warnings,
    dryRun: true,
    writesPerformed: false,
  });
}

export const dryRunRestore = buildRestorePlan;

export async function executeRestore({
  backup,
  tenantContext,
  secret,
  repositories,
  ownerConfirmation,
  auditRepository,
  restoreId = globalThis.crypto?.randomUUID?.() || `restore-${Date.now()}`,
  now = () => new Date().toISOString(),
} = {}) {
  const scope = normalizeScope(tenantContext);
  assertOwnerConfirmation(ownerConfirmation, scope);
  assertRepositoryMap(repositories);
  assertAuditRepository(auditRepository);
  const plan = await buildRestorePlan({ backup, tenantContext: toTenantContext(scope), secret, repositories });
  if (plan.status !== "READY_FOR_OWNER_CONFIRMATION" || !plan.checksumVerified) throw new Error(`Restore dry run failed: ${plan.errors.join(" ")}`);

  const snapshots = [];
  try {
    for (const [name, rows] of Object.entries(plan.records)) {
      const repository = repositories[name];
      const snapshot = await snapshotRepository(repository, scope);
      snapshots.push({ name, repository, snapshot });
      await restoreRepository(repository, rows, scope, { restoreId, mode: "confirmed-replace" });
    }
    const auditEntry = await appendRestoreAudit(auditRepository, scope, {
      restoreId,
      action: "RESTORE_COMPLETED",
      ownerId: ownerConfirmation.ownerId,
      ownerConfirmedAt: ownerConfirmation.confirmedAt,
      occurredAt: now(),
      datasetCounts: plan.datasetCounts,
      backupChecksum: backup.manifest.recordsChecksum,
    });
    return deepFreeze({ status: "RESTORED", restoreId, tenantId: scope.tenantId, dataScope: scope.dataScope, datasetCounts: plan.datasetCounts, auditEntry, writesPerformed: true });
  } catch (error) {
    const rollbackErrors = [];
    for (const item of snapshots.reverse()) {
      try {
        await restoreRepository(item.repository, item.snapshot, scope, { restoreId, mode: "rollback" });
      } catch (rollbackError) {
        rollbackErrors.push(`${item.name}: ${rollbackError.message}`);
      }
    }
    try {
      await appendRestoreAudit(auditRepository, scope, {
        restoreId,
        action: rollbackErrors.length ? "RESTORE_ROLLBACK_FAILED" : "RESTORE_ROLLED_BACK",
        ownerId: ownerConfirmation.ownerId,
        ownerConfirmedAt: ownerConfirmation.confirmedAt,
        occurredAt: now(),
        error: error.message,
        rollbackErrors,
      });
    } catch (auditError) {
      rollbackErrors.push(`audit: ${auditError.message}`);
    }
    throw new Error(`Restore failed and rollback ${rollbackErrors.length ? "requires intervention" : "completed"}: ${error.message}${rollbackErrors.length ? ` (${rollbackErrors.join("; ")})` : ""}`);
  }
}

async function snapshotRepository(repository, scope) {
  const snapshot = repository.snapshot || repository.exportTenant || repository.list;
  if (typeof snapshot !== "function") throw new Error("Restore repository cannot create a rollback snapshot.");
  return structuredClone(await snapshot.call(repository, toTenantContext(scope)));
}

async function restoreRepository(repository, rows, scope, options) {
  const restore = repository.restoreTenant || repository.restore;
  if (typeof restore !== "function") throw new Error("Restore repository does not support tenant restore.");
  return restore.call(repository, structuredClone(rows), toTenantContext(scope), options);
}

async function appendRestoreAudit(repository, scope, event) {
  const existing = await repository.list(toTenantContext(scope));
  const previous = Array.isArray(existing) ? existing.at(-1) : null;
  const payload = { ...event, tenantId: scope.tenantId, dataScope: scope.dataScope, workspaceId: scope.workspaceId || null, previousHash: previous?.hash || AUDIT_GENESIS_HASH };
  const entry = deepFreeze({ ...payload, hashAlgorithm: "SHA-256", hash: await sha256Hex(payload) });
  await repository.append(entry, toTenantContext(scope));
  return entry;
}

function assertOwnerConfirmation(confirmation, scope) {
  if (confirmation?.confirmed !== true || !confirmation.ownerId || !confirmation.confirmedAt) throw new Error("Explicit owner confirmation is required before restore execution.");
  if (confirmation.tenantId && confirmation.tenantId !== scope.tenantId) throw new Error("Owner confirmation belongs to a different tenant.");
  if (confirmation.workspaceId && confirmation.workspaceId !== scope.workspaceId) throw new Error("Owner confirmation belongs to a different workspace.");
}

function assertRepositoryMap(repositories) {
  if (!repositories || typeof repositories !== "object" || Array.isArray(repositories) || !Object.keys(repositories).length) throw new Error("Tenant repository adapters are required.");
}

function assertAuditRepository(repository) {
  if (!repository || typeof repository.list !== "function" || typeof repository.append !== "function") throw new Error("An append-only restore audit repository is required.");
}

function normalizeScope(context = {}) {
  const tenantId = String(context.tenant_id || context.tenantId || "").trim();
  const dataScope = String(context.data_scope || context.dataScope || "").trim();
  const workspaceId = String(context.workspace_id || context.workspaceId || "").trim();
  if (!tenantId || !dataScope) throw new Error("Tenant and data scope are required for backup operations.");
  return { tenantId, dataScope, workspaceId };
}

function toTenantContext(scope) {
  return { tenant_id: scope.tenantId, data_scope: scope.dataScope, ...(scope.workspaceId ? { workspace_id: scope.workspaceId } : {}) };
}

function normalizeDatasets(datasets = {}, scope) {
  if (!datasets || typeof datasets !== "object" || Array.isArray(datasets)) throw new Error("Backup datasets must be a named object.");
  return Object.fromEntries(Object.entries(datasets).map(([name, rows]) => {
    if (!Array.isArray(rows)) throw new Error(`Backup dataset ${name} must be an array.`);
    const copy = structuredClone(rows);
    copy.forEach((row) => {
      const tenantId = row?.tenant_id || row?.tenantId;
      const dataScope = row?.data_scope || row?.dataScope;
      if (tenantId && tenantId !== scope.tenantId) throw new Error(`Backup dataset ${name} contains cross-tenant data.`);
      if (dataScope && dataScope !== scope.dataScope) throw new Error(`Backup dataset ${name} contains cross-scope data.`);
    });
    return [name, copy];
  }));
}

function validateCounts(expected = {}, records) {
  const errors = [];
  for (const [name, rows] of Object.entries(records)) if (Number(expected[name]) !== rows.length) errors.push(`Backup dataset ${name} count verification failed.`);
  for (const name of Object.keys(expected)) if (!Object.hasOwn(records, name)) errors.push(`Backup dataset ${name} is missing.`);
  return errors;
}

function canonicalStringify(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
