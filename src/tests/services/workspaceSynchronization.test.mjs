import test from "node:test";
import assert from "node:assert/strict";
import { resolveInitialWorkspace } from "../../services/workspaceSelection.js";

test("dashboard workspace defaults to the authenticated active tenant", () => {
  const workspaces = [
    { id: "demo", settings: { tenantId: "demo-school-tenant", dataScope: "demo_sandbox" } },
    { id: "own", settings: { tenantId: "own-chit-business", dataScope: "own_business" } },
  ];
  const selected = resolveInitialWorkspace({
    workspaces,
    activeAuthWorkspace: { tenant_id: "own-chit-business", data_scope: "own_business" },
  });

  assert.equal(selected.id, "own");
});

test("an explicit persisted workspace still takes precedence", () => {
  const workspaces = [
    { id: "demo", settings: { tenantId: "demo-school-tenant" } },
    { id: "own", settings: { tenantId: "own-chit-business" } },
  ];
  const selected = resolveInitialWorkspace({
    workspaces,
    persistedId: "demo",
    activeAuthWorkspace: { tenant_id: "own-chit-business" },
  });

  assert.equal(selected.id, "demo");
});
