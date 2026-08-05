import test from "node:test";
import assert from "node:assert/strict";
import {
  isUuid,
  resolveAIChitWorkspaceScope,
} from "../../repositories/supabase/AIChitWorkspaceScope.js";

const WORKSPACE_A = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_B = "22222222-2222-4222-8222-222222222222";

function clientWithRows(rows, error = null) {
  let inRoles = null;
  const chain = {
    select() { return this; },
    eq() { return this; },
    in(_field, roles) { inRoles = roles; return this; },
    async order() {
      const filtered = inRoles ? rows.filter((row) => inRoles.includes(row.role)) : rows;
      return { data: filtered, error };
    },
  };
  return { from() { return chain; } };
}

test("valid UUID workspace context is used without a membership query", async () => {
  let queried = false;
  const client = { from() { queried = true; throw new Error("must not query"); } };
  const scope = await resolveAIChitWorkspaceScope({
    client,
    userId: "user-1",
    activeTenantContext: {
      workspace_id: WORKSPACE_A,
      tenant_id: "tenant-a",
      data_scope: "own_business",
    },
  });
  assert.equal(queried, false);
  assert.deepEqual(scope, {
    workspace_id: WORKSPACE_A,
    tenant_id: "tenant-a",
    data_scope: "own_business",
  });
});

test("semantic my_business workspace resolves to the exact authenticated membership UUID", async () => {
  const client = clientWithRows([
    { workspace_id: WORKSPACE_A, tenant_id: "tenant-a", data_scope: "own_business", role: "operator", status: "active" },
  ]);
  const scope = await resolveAIChitWorkspaceScope({
    client,
    userId: "user-1",
    activeTenantContext: {
      workspace_id: "my_business",
      tenant_id: "tenant-a",
      data_scope: "own_business",
    },
  });
  assert.equal(scope.workspace_id, WORKSPACE_A);
});

test("a stale semantic context may use the sole authorized write membership", async () => {
  const client = clientWithRows([
    { workspace_id: WORKSPACE_A, tenant_id: "live-tenant", data_scope: "real_tenant", role: "admin", status: "active" },
  ]);
  const scope = await resolveAIChitWorkspaceScope({
    client,
    userId: "user-1",
    activeTenantContext: {
      workspace_id: "my_business",
      tenant_id: "stale-seed",
      data_scope: "own_business",
    },
  });
  assert.deepEqual(scope, {
    workspace_id: WORKSPACE_A,
    tenant_id: "live-tenant",
    data_scope: "real_tenant",
  });
});

test("ambiguous memberships are blocked instead of selecting the wrong workspace", async () => {
  const client = clientWithRows([
    { workspace_id: WORKSPACE_A, tenant_id: "tenant-a", data_scope: "real_tenant", role: "operator", status: "active" },
    { workspace_id: WORKSPACE_B, tenant_id: "tenant-b", data_scope: "real_tenant", role: "admin", status: "active" },
  ]);
  await assert.rejects(
    resolveAIChitWorkspaceScope({
      client,
      userId: "user-1",
      activeTenantContext: { workspace_id: "my_business" },
    }),
    /Multiple business workspaces/
  );
});

test("viewer-only membership is not accepted for draft writes", async () => {
  const client = clientWithRows([
    { workspace_id: WORKSPACE_A, tenant_id: "tenant-a", data_scope: "real_tenant", role: "viewer", status: "active" },
  ]);
  await assert.rejects(
    resolveAIChitWorkspaceScope({
      client,
      userId: "user-1",
      activeTenantContext: { workspace_id: "my_business" },
      requireWrite: true,
    }),
    /No write-capable active workspace membership/
  );
});

test("UUID validation rejects semantic workspace labels", () => {
  assert.equal(isUuid(WORKSPACE_A), true);
  assert.equal(isUuid("my_business"), false);
});
