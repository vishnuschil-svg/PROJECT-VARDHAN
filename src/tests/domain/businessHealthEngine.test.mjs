import test from "node:test";
import assert from "node:assert/strict";
import { BusinessHealthEngine } from "../../domain/chit/services/BusinessHealthEngine.js";

test("BusinessHealthEngine calculates health from chit domain data", () => {
  const result = BusinessHealthEngine.buildHealth({
    groups: [
      {
        id: "group-1",
        status: "active",
        monthly_amount: 1000,
        total_members: 10,
        pending_collections: 1000,
        today_collections: 2000,
      },
    ],
    members: [
      { id: "member-1", status: "active" },
      { id: "member-2", status: "active" },
    ],
    collections: [
      {
        id: "collection-1",
        member_id: "member-1",
        paid_amount: 5000,
        pending_amount: 500,
        payment_date: new Date().toISOString().slice(0, 10),
      },
    ],
    financeEntries: [],
  });

  assert.equal(typeof result.score, "number");
  assert.equal(result.metrics.activeGroups, 1);
  assert.equal(result.metrics.activeMembers, 2);
  assert.equal(result.pendingRate, 5);
  assert.ok(result.aiSuggestion.length > 0);
});
