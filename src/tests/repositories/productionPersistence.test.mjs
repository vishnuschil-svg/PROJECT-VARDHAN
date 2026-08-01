import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveRepositoryBackend, RepositoryConfigurationError } from "../../config/repositoryBackend.js";
import { LocalStorageMigrationEngine, MIGRATION_ORDER, reconcile } from "../../services/localStorageMigrationService.js";

const context = { tenant_id: "tenant-a", data_scope: "real_tenant" };
const row = (id, extra = {}) => ({ id, ...context, ...extra });
const fixture = () => ({
  groups: [row("g1")], members: [row("m1", { group_id: "g1" })],
  collections: [row("c1", { group_id: "g1", member_id: "m1", paid_amount: 100, pending_amount: 20 })],
  receipts: [row("r1", { group_id: "g1", member_id: "m1", amount: 100 })],
  ledger: [row("l1", { group_id: "g1", member_id: "m1", amount: 100 })],
  finance: [row("f1", { group_id: "g1", amount: 100 })], auctions: [row("a1", { group_id: "g1" })],
  payouts: [row("p1", { group_id: "g1", member_id: "m1", amount: 80 })],
});

test("production mode blocks local fallback and missing Supabase configuration", () => {
  assert.throws(() => resolveRepositoryBackend({ VITE_APP_MODE: "production", VITE_REPOSITORY_BACKEND: "local" }), RepositoryConfigurationError);
  assert.throws(() => resolveRepositoryBackend({ VITE_APP_MODE: "production", VITE_REPOSITORY_BACKEND: "supabase" }), /VITE_SUPABASE_URL/);
  assert.equal(resolveRepositoryBackend({ VITE_APP_MODE: "production", VITE_REPOSITORY_BACKEND: "supabase", VITE_SUPABASE_URL: "https://example.supabase.co", VITE_SUPABASE_ANON_KEY: "anon" }), "supabase");
});

test("repository-local trial mode resolves the local backend explicitly", () => {
  assert.equal(resolveRepositoryBackend({ VITE_APP_MODE: "demo", VITE_REPOSITORY_BACKEND: "local" }), "local");
});

function harness(seed = fixture(), failAt = "") {
  const destinationRows = Object.fromEntries(MIGRATION_ORDER.map((name) => [name, []]));
  const audits = new Map(); const backups = [];
  const sources = Object.fromEntries(MIGRATION_ORDER.map((name) => [name, { list: () => seed[name] }]));
  const destinations = Object.fromEntries(MIGRATION_ORDER.map((name) => [name, {
    getById: async (id) => destinationRows[name].find((item) => item.id === id),
    create: async (item) => { if (failAt === name) throw new Error("planned failure"); destinationRows[name].push(item); return item; },
    delete: async (id) => { destinationRows[name] = destinationRows[name].filter((item) => item.id !== id); },
    list: async () => destinationRows[name],
  }]));
  const auditStore = { get: async (id) => audits.get(id), save: async (audit) => audits.set(audit.migrationId, audit) };
  return { engine: new LocalStorageMigrationEngine({ sources, destinations, auditStore, backupStore: { save: async (value) => backups.push(value) } }), destinationRows, audits, backups };
}

test("migration dry run backs up, validates ownership, and preserves dependency order", async () => {
  const h = harness(); const result = await h.engine.run(context, { dryRun: true, migrationId: "dry" });
  assert.equal(result.created.length, 0); assert.deepEqual(result.preview.order, MIGRATION_ORDER); assert.equal(h.backups.length, 1);
  const bad = fixture(); bad.members[0].tenant_id = "tenant-b";
  await assert.rejects(harness(bad).engine.run(context), /invalid tenant ownership/);
});

test("migration prevents duplicates and reconciles counts and financial totals", async () => {
  const h = harness(); await h.engine.run(context, { migrationId: "one" });
  await h.engine.run(context, { migrationId: "two" });
  assert.equal(h.destinationRows.groups.length, 1);
  assert.equal(reconcile(fixture(), h.destinationRows, context).ok, true);
  h.destinationRows.finance[0].amount = 99;
  assert.match(reconcile(fixture(), h.destinationRows, context).errors.join(" "), /finance total differs/);
});

test("failed migration is resumable and rollback tracks only created records", async () => {
  const h = harness(fixture(), "collections");
  await assert.rejects(h.engine.run(context, { migrationId: "resume" }), /planned failure/);
  assert.deepEqual(h.audits.get("resume").completed, ["groups", "members"]);
  h.engine.destinations.collections.create = async (item) => { h.destinationRows.collections.push(item); return item; };
  await h.engine.run(context, { migrationId: "resume" });
  const rollback = await h.engine.rollback("resume", context);
  assert.equal(rollback.removed.length, MIGRATION_ORDER.length);
  assert.equal(h.destinationRows.groups.length, 0);
});

test("RLS migration expresses tenant-scoped select, insert, update, and delete denial", async () => {
  const sql = await readFile(new URL("../../../supabase/migrations/002_production_rls.sql", import.meta.url), "utf8");
  const verification = await readFile(new URL("../../../supabase/verification/rls_isolation.sql", import.meta.url), "utf8");
  for (const operation of ["select", "insert", "update", "delete"]) assert.match(sql, new RegExp(`tenant_${operation}`));
  assert.match(sql, /workspace_memberships/); assert.match(sql, /force row level security/);
  assert.match(verification, /cross_tenant_must_be_zero/); assert.match(verification, /expected: RLS violation/);
});
