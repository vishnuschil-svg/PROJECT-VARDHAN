import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { encryptJSON, decryptJSON, ENCRYPTION_VERSION } from "../../security/EncryptionService.js";
import { createEncryptedBackup, buildRestorePlan, executeRestore, exportTenantBackup } from "../../security/BackupRestoreService.js";

const readProjectFile = (path) => readFile(new URL(`../../../${path}`, import.meta.url), "utf8");

test("AES-GCM encryption authenticates payloads", async () => {
  const encrypted = await encryptJSON({ tenant: "tenant-a", amount: 100 }, "correct horse battery staple");
  assert.equal(encrypted.version, ENCRYPTION_VERSION);
  assert.deepEqual(await decryptJSON(encrypted, "correct horse battery staple"), { tenant: "tenant-a", amount: 100 });
  await assert.rejects(() => decryptJSON(encrypted, "incorrect secret value"), /authenticated/i);
});

test("backup restore plans are encrypted, tenant-bound, and never write directly", async () => {
  const tenantContext = { tenant_id: "tenant-a", data_scope: "real_tenant" };
  const state = { members: [{ id: "old-member", tenant_id: "tenant-a", data_scope: "real_tenant" }], collections: [] };
  const makeRepository = (name, fail = false) => ({
    list: async () => structuredClone(state[name]),
    restore: async (rows, context, options) => {
      assert.equal(context.tenant_id, "tenant-a");
      if (fail && options.mode === "confirmed-replace") throw new Error("planned repository failure");
      state[name] = structuredClone(rows);
    },
  });
  const repositories = { members: makeRepository("members"), collections: makeRepository("collections") };
  const auditRows = [];
  const auditRepository = { list: async () => structuredClone(auditRows), append: async (entry) => auditRows.push(entry) };
  const backup = await createEncryptedBackup({
    tenantContext,
    datasets: { members: [{ id: "member-1", tenant_id: "tenant-a", data_scope: "real_tenant" }], collections: [] },
    secret: "tenant backup secret",
    createdAt: "2026-07-21T00:00:00.000Z",
  });
  assert.equal(backup.manifest.datasetCounts.members, 1);
  const plan = await buildRestorePlan({ backup, tenantContext, secret: "tenant backup secret" });
  assert.equal(plan.status, "READY_FOR_OWNER_CONFIRMATION");
  assert.equal(plan.checksumVerified, true);
  assert.equal(plan.writesPerformed, false);
  await assert.rejects(() => executeRestore({ backup, tenantContext, secret: "tenant backup secret", repositories, auditRepository }), /owner confirmation/i);
  const restored = await executeRestore({
    backup, tenantContext, secret: "tenant backup secret", repositories, auditRepository,
    ownerConfirmation: { confirmed: true, ownerId: "owner-1", confirmedAt: "2026-07-21T00:01:00.000Z", tenantId: "tenant-a" },
    restoreId: "restore-success", now: () => "2026-07-21T00:02:00.000Z",
  });
  assert.equal(restored.status, "RESTORED");
  assert.equal(state.members[0].id, "member-1");
  assert.equal(auditRows.at(-1).action, "RESTORE_COMPLETED");
  assert.equal(auditRows.at(-1).hash.length, 64);
  const exported = await exportTenantBackup({ tenantContext, repositories, secret: "tenant backup secret", createdAt: "2026-07-21T00:03:00.000Z" });
  assert.equal(exported.manifest.tenantId, "tenant-a");

  state.members = [{ id: "rollback-member", tenant_id: "tenant-a", data_scope: "real_tenant" }];
  const failingRepositories = { members: makeRepository("members"), collections: makeRepository("collections", true) };
  await assert.rejects(() => executeRestore({
    backup, tenantContext, secret: "tenant backup secret", repositories: failingRepositories, auditRepository,
    ownerConfirmation: { confirmed: true, ownerId: "owner-1", confirmedAt: "2026-07-21T00:04:00.000Z" }, restoreId: "restore-failure",
  }), /rollback completed/i);
  assert.equal(state.members[0].id, "rollback-member");
  assert.equal(auditRows.at(-1).action, "RESTORE_ROLLED_BACK");
  await assert.rejects(
    () => buildRestorePlan({ backup, tenantContext: { tenant_id: "tenant-b", data_scope: "real_tenant" }, secret: "tenant backup secret" }),
    /different tenant/i,
  );
});

test("API hardening includes rate limiting, security headers, and encrypted secrets", async () => {
  const [source, rateLimit, vercel] = await Promise.all([
    readProjectFile("backend/main.py"),
    readProjectFile("backend/rate_limit.py"),
    readProjectFile("vercel.json"),
  ]);
  assert.match(source, /HTTP_429_TOO_MANY_REQUESTS/);
  for (const header of ["Content-Security-Policy", "Strict-Transport-Security", "Permissions-Policy", "X-Frame-Options", "X-Content-Type-Options"]) {
    assert.ok(source.includes(header), header);
  }
  assert.match(source, /draw_cipher\(\)\.encrypt/);
  assert.match(source, /where id = \$1 and workspace_id = \$2 and tenant_id = \$3/);
  assert.match(rateLimit, /class RedisRateLimitAdapter/);
  assert.match(rateLimit, /class GatewayRateLimitAdapter/);
  assert.match(rateLimit, /Production requires RATE_LIMIT_BACKEND=redis or RATE_LIMIT_BACKEND=gateway/);
  for (const header of ["Content-Security-Policy", "Strict-Transport-Security", "Permissions-Policy", "X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy"]) {
    assert.ok(vercel.includes(header), `Vercel ${header}`);
  }
});

test("existing platform hardening covers permissions, audit/error logs, backup UI, performance, and accessibility", async () => {
  const [permissions, audit, logger, backup, router, aiFlow] = await Promise.all([
    readProjectFile("src/services/auth/PermissionService.js"),
    readProjectFile("src/security/AuditLogger.js"),
    readProjectFile("src/lib/monitoring/Logger.js"),
    readProjectFile("src/pages/platform-admin/BackupRestore.jsx"),
    readProjectFile("src/routes/AppRouter.jsx"),
    readProjectFile("src/pages/chits/AIChitFlow.jsx"),
  ]);
  assert.match(permissions, /ROLE_ACTIONS/);
  assert.match(audit, /tenantId/);
  assert.match(logger, /redactSensitive/);
  assert.match(logger, /tenant_id/);
  assert.match(backup, /Backup & Restore/);
  assert.match(router, /lazy\(\(\) => import/);
  assert.match(aiFlow, /aria-(label|invalid|describedby)/);
});
