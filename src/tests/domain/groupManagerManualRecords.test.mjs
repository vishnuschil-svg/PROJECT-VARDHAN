import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createDistributionRecord, createManualBidRecord, validateManualBidRecord } from "../../domain/groupManager/manualRecords.js";
import { ManualBidRecordsRepository, DistributionRecordsRepository } from "../../repositories/chits/GroupManagerRepositories.js";
import { GROUP_MANAGER_PERMISSIONS } from "../../config/groupManagerSafety.js";
import { PermissionService } from "../../services/auth/PermissionService.js";

const context = { tenantId: "tenant-a", userId: "user-a", now: "2026-08-09T10:00:00.000Z" };
const validBid = {
  groupId: "group-a", periodId: "2026-08", memberEntries: [{ memberId: "member-a", recordedAmount: 72000 }],
  declaredRecipientMemberId: "member-a", recordedDistributionAmount: 80000, recordDate: "2026-08-09",
  confirmedExternalDecision: true,
};

test("Manual Bid Record requires an organizer-entered recipient", () => {
  const validation = validateManualBidRecord({ ...validBid, declaredRecipientMemberId: "" });
  assert.equal(validation.isValid, false);
  assert.match(validation.errors.join(" "), /select the final recipient/i);
});

test("Manual Bid Record requires an organizer-entered final distribution amount", () => {
  const validation = validateManualBidRecord({ ...validBid, recordedDistributionAmount: "" });
  assert.equal(validation.isValid, false);
  assert.match(validation.errors.join(" "), /enter the final distribution amount/i);
});

test("Manual Bid Record stores entered values without winner calculation or ranking output", () => {
  const record = createManualBidRecord(validBid, context);
  assert.equal(record.declared_recipient_member_id, "member-a");
  assert.equal(record.recorded_distribution_amount, 80000);
  for (const prohibited of ["winner", "ranking", "best_bid", "recommended_recipient", "calculated_distribution_amount"]) {
    assert.equal(Object.hasOwn(record, prohibited), false);
  }
});

test("Manual Bid Record permanently identifies an external organizer decision", () => {
  const record = createManualBidRecord(validBid, context);
  assert.equal(record.decision_source, "EXTERNAL_ORGANIZER_DECISION");
  assert.equal(record.record_source, "MANUAL_ORGANIZER_ENTRY");
});

test("Distribution Record can link to a Manual Bid Record without deriving outcome fields", () => {
  const record = createDistributionRecord({
    groupId: "group-a", periodId: "2026-08", recipientMemberId: "member-a", distributionAmount: 80000,
    distributionDate: "2026-08-09", sourceRecordId: "manual-1",
  }, context);
  assert.equal(record.source_record_id, "manual-1");
  assert.equal(record.source_type, "MANUAL_BID_RECORD");
  assert.equal(record.recipient_member_id, "member-a");
  assert.equal(record.distribution_amount, 80000);
});

test("record builders have no ledger or report side effects before repository save", () => {
  const before = storage.snapshot();
  createManualBidRecord(validBid, context);
  createDistributionRecord({ groupId: "group-a", periodId: "2026-08", recipientMemberId: "member-a", distributionAmount: 80000, distributionDate: "2026-08-09" }, context);
  assert.deepEqual(storage.snapshot(), before);
  const serviceSource = fs.readFileSync(new URL("../../services/manualRecordsService.js", import.meta.url), "utf8");
  assert.ok(serviceSource.indexOf("repository.create(record") < serviceSource.indexOf("postDistributionAccounting(saved"));
});

test("local repositories enforce tenant isolation for reads and writes", () => {
  storage.clear();
  const tenantA = { tenant_id: "tenant-a", data_scope: "real_tenant" };
  const tenantB = { tenant_id: "tenant-b", data_scope: "real_tenant" };
  const bid = ManualBidRecordsRepository.create(createManualBidRecord(validBid, context), { activeTenantContext: tenantA });
  DistributionRecordsRepository.create(createDistributionRecord({ groupId: "group-a", periodId: "2026-08", recipientMemberId: "member-a", distributionAmount: 80000, distributionDate: "2026-08-09", sourceRecordId: bid.id }, context), { activeTenantContext: tenantA });
  assert.equal(ManualBidRecordsRepository.list({ activeTenantContext: tenantB }).data.length, 0);
  assert.equal(DistributionRecordsRepository.list({ activeTenantContext: tenantB }).data.length, 0);
  assert.equal(ManualBidRecordsRepository.update(bid.id, { notes: "cross tenant" }, { activeTenantContext: tenantB }), null);
  assert.equal(ManualBidRecordsRepository.list({ activeTenantContext: tenantA }).data.length, 1);
});

test("migration is additive, tenant-scoped, and contains no legacy table mutation", () => {
  const sql = fs.readFileSync(new URL("../../../supabase/migrations/015_group_manager_manual_distribution_records.sql", import.meta.url), "utf8");
  assert.match(sql, /create table if not exists public\.manual_bid_records/i);
  assert.match(sql, /create table if not exists public\.distribution_records/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /force row level security/i);
  assert.match(sql, /has_tenant_role\([^)]*array\['owner','admin'\]/i);
  assert.match(sql, /organizer_admin_(insert|update)/i);
  assert.doesNotMatch(sql, /alter table public\.(chit_auctions|chit_winners|lucky_draws|chit_payouts)/i);
});

test("manual record feature permissions preserve owner/admin writes and deny normal staff", () => {
  const action = GROUP_MANAGER_PERMISSIONS.MANUAL_BID_RECORD_CREATE;
  assert.equal(PermissionService.can({ action, role: "CUSTOMER_OWNER" }), true);
  assert.equal(PermissionService.can({ action, role: "ADMIN" }), true);
  assert.equal(PermissionService.can({ action, role: "STAFF" }), false);
  assert.equal(PermissionService.can({ action, role: "DEMO_CUSTOMER" }), false);
});

test("manual record service checks granular permission before persistence", () => {
  const service = fs.readFileSync(new URL("../../services/manualRecordsService.js", import.meta.url), "utf8");
  assert.ok(service.indexOf("requirePermission(GROUP_MANAGER_PERMISSIONS.MANUAL_BID_RECORD_CREATE") < service.indexOf("repository.create(record"));
  assert.ok(service.indexOf("requirePermission(GROUP_MANAGER_PERMISSIONS.DISTRIBUTION_RECORD_CREATE") < service.indexOf("postDistributionAccounting(saved"));
  assert.match(service, /GROUP_MANAGER_PERMISSION_DENIED/);
});

test("new neutral routes coexist without changing legacy auction and lucky-draw routes", () => {
  const routes = fs.readFileSync(new URL("../../routes/AppRouter.jsx", import.meta.url), "utf8");
  assert.match(routes, /path="\/chits\/manual-records"/);
  assert.match(routes, /path="\/chits\/distributions"/);
  assert.match(routes, /path="\/chits\/auctions"/);
  assert.match(routes, /path="\/chits\/lucky-draw"/);
  assert.match(routes, /permission=\{GROUP_MANAGER_PERMISSIONS\.MANUAL_BID_RECORD_CREATE\}/);
  assert.match(routes, /permission=\{GROUP_MANAGER_PERMISSIONS\.DISTRIBUTION_RECORD_CREATE\}/);
});

const storage = createMemoryStorage();
globalThis.window = { localStorage: storage };

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
    snapshot: () => Object.fromEntries(values),
  };
}
