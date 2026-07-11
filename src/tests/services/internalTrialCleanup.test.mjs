import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getAIInsights } from "../../services/aiInsightsService.js";
import { getActivityTimeline } from "../../services/activityService.js";
import { getBusinessHealthDashboardModel } from "../../services/businessHealthService.js";
import { listTenantGroups, listTenantMembers } from "../../services/chitDataService.js";
import { runInternalTrialBusinessDataCleanup } from "../../services/internalTrialCleanupService.js";
import { getNotificationCenter } from "../../services/notificationService.js";

class MemoryLocalStorage {
  constructor() {
    this.store = new Map();
  }

  getItem(key) {
    return this.store.get(key) || null;
  }

  setItem(key, value) {
    this.store.set(key, String(value));
  }

  removeItem(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

describe("internal trial cleanup", () => {
  const tenant = { tenant_id: "tenant-clean", data_scope: "own_business" };

  beforeEach(() => {
    global.window = { localStorage: new MemoryLocalStorage() };
  });

  afterEach(() => {
    delete global.window;
  });

  it("does not auto-seed groups or members for a clean tenant", () => {
    assert.deepEqual(listTenantGroups(tenant), []);
    assert.deepEqual(listTenantMembers(tenant), []);

    const dashboard = getBusinessHealthDashboardModel(tenant);
    assert.deepEqual(dashboard.kpis.map((kpi) => kpi.value), [
      "0",
      "0",
      "₹0",
      "₹0",
      "₹0",
      "₹0",
    ]);
  });

  it("does not generate demo AI, notifications, or activity on empty business data", () => {
    assert.deepEqual(getAIInsights(tenant), []);
    assert.deepEqual(getActivityTimeline(tenant), []);
    assert.deepEqual(getNotificationCenter(tenant), { unreadCount: 0, notifications: [] });
  });

  it("removes business demo storage while preserving install configuration", () => {
    window.localStorage.setItem("vardhan.chit.groups.v1", JSON.stringify([{ id: "demo-chit-001" }]));
    window.localStorage.setItem("vardhan.chit.members.v1", JSON.stringify([{ id: "member-demo-001" }]));
    window.localStorage.setItem("vardhan.ai.chitDrafts.v1", JSON.stringify([{ id: "sample-ai" }]));
    window.localStorage.setItem("vardhan.chit.paymentSettings.v1", JSON.stringify([{ id: "organizer-payment-settings" }]));
    window.localStorage.setItem("vardhan.workspace.active.v1", "workspace-1");

    const result = runInternalTrialBusinessDataCleanup();

    assert.equal(result.ran, true);
    assert.equal(window.localStorage.getItem("vardhan.chit.groups.v1"), null);
    assert.equal(window.localStorage.getItem("vardhan.chit.members.v1"), null);
    assert.equal(window.localStorage.getItem("vardhan.ai.chitDrafts.v1"), null);
    assert.equal(window.localStorage.getItem("vardhan.chit.paymentSettings.v1"), JSON.stringify([{ id: "organizer-payment-settings" }]));
    assert.equal(window.localStorage.getItem("vardhan.workspace.active.v1"), "workspace-1");
  });
});
