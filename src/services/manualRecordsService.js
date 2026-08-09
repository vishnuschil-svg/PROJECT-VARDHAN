import { createRepositoryProvider } from "../repositories/repositoryProvider.js";
import {
  createDistributionRecord,
  createManualBidRecord,
  createSensitiveAuditEvent,
} from "../domain/groupManager/manualRecords.js";
import { ActivityRepository } from "../repositories/ActivityRepository.js";
import { ReportsRepository } from "../repositories/ReportsRepository.js";
import { saveLedgerEntryPersistent } from "./winnerLifecyclePersistence.js";
import { trackSecurityAction } from "./securityService.js";
import { GROUP_MANAGER_PERMISSIONS } from "../config/groupManagerSafety.js";
import { PermissionService } from "./auth/PermissionService.js";

export async function listManualBidRecords(activeTenantContext) {
  return listRows("ManualBidRecordsRepository", activeTenantContext);
}

export async function listDistributionRecords(activeTenantContext) {
  return listRows("DistributionRecordsRepository", activeTenantContext);
}

export async function saveManualBidRecord(input, accessContext = {}) {
  const { activeTenantContext, userId } = accessContext;
  requirePermission(GROUP_MANAGER_PERMISSIONS.MANUAL_BID_RECORD_CREATE, accessContext);
  const context = requireContext(activeTenantContext, userId);
  const record = createManualBidRecord(input, context);
  const repository = createRepositoryProvider().ManualBidRecordsRepository;
  const saved = unwrap(await repository.create(record, { activeTenantContext }));
  if (!saved) throw new Error("Manual bid record could not be saved.");
  const audit = logAudit("MANUAL_BID_RECORD_CREATE", null, saved, context, activeTenantContext);
  recordActivity("Manual bid details recorded", saved, activeTenantContext);
  return { record: saved, audit };
}

export async function saveDistributionRecord(input, accessContext = {}) {
  const { activeTenantContext, userId } = accessContext;
  requirePermission(GROUP_MANAGER_PERMISSIONS.DISTRIBUTION_RECORD_CREATE, accessContext);
  const context = requireContext(activeTenantContext, userId);
  const record = createDistributionRecord(input, context);
  const repository = createRepositoryProvider().DistributionRecordsRepository;
  const saved = unwrap(await repository.create(record, { activeTenantContext }));
  if (!saved) throw new Error("Distribution record could not be saved.");
  await postDistributionAccounting(saved, activeTenantContext);
  const audit = logAudit("DISTRIBUTION_RECORD_CREATE", null, saved, context, activeTenantContext);
  recordActivity("Distribution recorded", saved, activeTenantContext);
  return { record: saved, audit };
}

export async function updateManualBidRecord(id, input, accessContext = {}) {
  const { activeTenantContext, userId } = accessContext;
  requirePermission(GROUP_MANAGER_PERMISSIONS.MANUAL_BID_RECORD_EDIT, accessContext);
  const context = requireContext(activeTenantContext, userId);
  const repository = createRepositoryProvider().ManualBidRecordsRepository;
  const previous = unwrap(await repository.getById(id, { activeTenantContext }));
  if (!previous) throw new Error("Manual bid record was not found in this workspace.");
  const next = createManualBidRecord({ ...input, id }, context);
  const saved = unwrap(await repository.update(id, { ...next, created_at: previous.created_at, created_by: previous.created_by }, { activeTenantContext }));
  return { record: saved, audit: logAudit("MANUAL_BID_RECORD_EDIT", previous, saved, context, activeTenantContext) };
}

export async function updateDistributionRecord(id, input, accessContext = {}) {
  const { activeTenantContext, userId } = accessContext;
  requirePermission(GROUP_MANAGER_PERMISSIONS.DISTRIBUTION_RECORD_EDIT, accessContext);
  const context = requireContext(activeTenantContext, userId);
  const repository = createRepositoryProvider().DistributionRecordsRepository;
  const previous = unwrap(await repository.getById(id, { activeTenantContext }));
  if (!previous) throw new Error("Distribution record was not found in this workspace.");
  const next = createDistributionRecord({ ...input, id }, context);
  const saved = unwrap(await repository.update(id, { ...next, created_at: previous.created_at, created_by: previous.created_by }, { activeTenantContext }));
  await postDistributionAccounting(saved, activeTenantContext);
  return { record: saved, audit: logAudit("DISTRIBUTION_RECORD_EDIT", previous, saved, context, activeTenantContext) };
}

async function listRows(name, activeTenantContext) {
  if (!activeTenantContext?.tenant_id || !activeTenantContext?.data_scope) return [];
  const result = await createRepositoryProvider()[name].list({ activeTenantContext, pageSize: 500 });
  return result?.items || result?.data || (Array.isArray(result) ? result : []);
}

function requireContext(activeTenantContext, userId) {
  if (!activeTenantContext?.tenant_id || !activeTenantContext?.data_scope) throw new Error("Select a business workspace before saving.");
  return { tenantId: activeTenantContext.tenant_id, userId: userId || null };
}

function requirePermission(permission, accessContext = {}) {
  if (!PermissionService.can({ action: permission, ...accessContext })) {
    const error = new Error("You do not have permission to change organizer decision records.");
    error.code = "GROUP_MANAGER_PERMISSION_DENIED";
    throw error;
  }
}

function recordActivity(title, record, activeTenantContext) {
  ActivityRepository.addActivity({
    title,
    description: `Organizer-entered record for period ${record.period_id}.`,
    time: record.created_at,
    icon: "Record",
    route: "/chits/manual-records",
  }, activeTenantContext);
}

async function postDistributionAccounting(record, activeTenantContext) {
  await saveLedgerEntryPersistent({
    entry_type: "DISTRIBUTION_RECORDED",
    entry_date: record.distribution_date,
    group_id: record.group_id,
    member_id: record.recipient_member_id,
    amount: record.distribution_amount,
    debit: Number(record.distribution_amount),
    credit: 0,
    description: "Organizer-entered distribution record",
    reference_no: `distribution:${record.id}`,
    source_type: "DISTRIBUTION_RECORD",
    source_id: record.id,
    decision_source: record.decision_source,
  }, activeTenantContext);
  ReportsRepository.saveReport({
    reportType: "DISTRIBUTION_RECORD",
    sourceId: record.id,
    groupId: record.group_id,
    periodId: record.period_id,
    amount: record.distribution_amount,
    decisionSource: record.decision_source,
  }, activeTenantContext);
}

function logAudit(action, previousValue, newValue, context, activeTenantContext) {
  const event = createSensitiveAuditEvent({ action, previousValue, newValue, context });
  trackSecurityAction({
    action,
    actor: { id: context.userId },
    workspace: { tenant_id: activeTenantContext.tenant_id, settings: { tenantId: activeTenantContext.tenant_id } },
    module: "GROUP_MANAGER_MANUAL_RECORDS",
    metadata: { ...event, record_type: action.startsWith("MANUAL_BID") ? "MANUAL_BID_RECORD" : "DISTRIBUTION_RECORD", record_id: newValue.id },
  });
  return event;
}

function unwrap(result) {
  if (result?.success === false) throw new Error(result.message || "Repository operation failed.");
  return result?.success === true ? result.data : result;
}
