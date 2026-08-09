import {
  DECISION_SOURCE,
  RECORD_SOURCE,
} from "../../config/groupManagerSafety.js";

export function validateManualBidRecord(input = {}) {
  const errors = [];
  if (!input.groupId) errors.push("Group is required.");
  if (!input.periodId) errors.push("Period / Month is required.");
  if (!Array.isArray(input.memberEntries) || input.memberEntries.length === 0) errors.push("Add at least one member record.");
  if (input.memberEntries?.some((entry) => !entry.memberId || !isPositive(entry.recordedAmount))) errors.push("Every member record requires a member and recorded amount.");
  if (!input.declaredRecipientMemberId) errors.push("Organizer must select the final recipient.");
  if (!isPositive(input.recordedDistributionAmount)) errors.push("Organizer must enter the final distribution amount.");
  if (input.confirmedExternalDecision !== true) errors.push("Organizer confirmation is required.");
  return { isValid: errors.length === 0, errors };
}

export function createManualBidRecord(input = {}, context = {}) {
  const validation = validateManualBidRecord(input);
  if (!validation.isValid) throw new Error(validation.errors[0]);
  const now = context.now || new Date().toISOString();
  return {
    id: input.id,
    tenant_id: context.tenantId,
    group_id: input.groupId,
    period_id: input.periodId,
    member_entries: input.memberEntries.map((entry) => ({ member_id: entry.memberId, recorded_amount: Number(entry.recordedAmount), notes: entry.notes || "" })),
    declared_recipient_member_id: input.declaredRecipientMemberId,
    recorded_distribution_amount: Number(input.recordedDistributionAmount),
    record_date: input.recordDate,
    reference_number: input.referenceNumber || "",
    notes: input.notes || "",
    attachment_path: input.attachmentPath || "",
    decision_source: DECISION_SOURCE,
    record_source: RECORD_SOURCE,
    created_by: context.userId,
    updated_by: context.userId,
    created_at: now,
    updated_at: now,
  };
}

export function validateDistributionRecord(input = {}) {
  const errors = [];
  if (!input.groupId) errors.push("Group is required.");
  if (!input.periodId) errors.push("Period / Month is required.");
  if (!input.recipientMemberId) errors.push("Organizer must select the recipient.");
  if (!isPositive(input.distributionAmount)) errors.push("Organizer must enter the distribution amount.");
  if (!input.distributionDate) errors.push("Distribution date is required.");
  return { isValid: errors.length === 0, errors };
}

export function createDistributionRecord(input = {}, context = {}) {
  const validation = validateDistributionRecord(input);
  if (!validation.isValid) throw new Error(validation.errors[0]);
  const now = context.now || new Date().toISOString();
  return {
    id: input.id,
    tenant_id: context.tenantId,
    group_id: input.groupId,
    period_id: input.periodId,
    recipient_member_id: input.recipientMemberId,
    distribution_amount: Number(input.distributionAmount),
    distribution_date: input.distributionDate,
    reference_number: input.referenceNumber || "",
    notes: input.notes || "",
    attachment_path: input.attachmentPath || "",
    source_record_id: input.sourceRecordId || input.manualBidRecordId || null,
    source_type: input.sourceRecordId || input.manualBidRecordId ? "MANUAL_BID_RECORD" : "DIRECT_ORGANIZER_ENTRY",
    decision_source: DECISION_SOURCE,
    record_source: RECORD_SOURCE,
    entered_by: context.userId,
    created_by: context.userId,
    updated_by: context.userId,
    created_at: now,
    updated_at: now,
  };
}

export function createSensitiveAuditEvent({ action, previousValue = null, newValue, context = {} }) {
  return {
    action,
    previous_value: previousValue,
    new_value: newValue,
    tenant_id: context.tenantId,
    group_id: newValue?.group_id || previousValue?.group_id || null,
    actor_user_id: context.userId,
    record_source: RECORD_SOURCE,
    decision_source: newValue?.decision_source || DECISION_SOURCE,
    created_at: context.now || new Date().toISOString(),
  };
}

export function adaptLegacyOutcomeForDisplay(row = {}) {
  return {
    id: row.id,
    group_id: row.group_id || row.chit_group_id,
    period_id: String(row.period_id || row.auction_month || ""),
    recipient_member_id: row.recipient_member_id || row.winner_member_id || row.winner_id || "",
    distribution_amount: Number(row.distribution_amount ?? row.prize_amount ?? row.payout_amount ?? row.winner_payable ?? 0),
    distribution_date: row.distribution_date || row.auction_date || row.created_at,
    reference_number: row.reference_number || row.reference_no || "",
    notes: row.notes || "",
    legacy: true,
    source_record_type: "LEGACY_REGISTERED_OPERATION",
  };
}

function isPositive(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}
