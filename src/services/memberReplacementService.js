import { MemberStateRepository } from "../repositories/MemberStateRepository.js";
import { MemberReplacementRepository } from "../repositories/MemberReplacementRepository.js";

export function previewMemberReplacement({ groupId, outgoingMember, incomingMember, effectiveMonth, reason, transferRule = "FUTURE_ONLY" } = {}) {
  return {
    groupId,
    outgoingMemberId: outgoingMember?.id || "",
    incomingMemberId: incomingMember?.id || "",
    effectiveMonth: Number(effectiveMonth || 1),
    reason,
    transferRule,
    warnings: ["Old receipts remain with outgoing member. Only future obligations may transfer."],
    canConfirm: Boolean(groupId && outgoingMember?.id && incomingMember?.id && reason),
  };
}

export function confirmMemberReplacement(input, activeTenantContext) {
  const preview = previewMemberReplacement(input);
  if (!preview.canConfirm) return { success: false, preview, message: "Replacement requires group, outgoing member, incoming member and reason." };
  const now = new Date().toISOString();
  const replacement = MemberReplacementRepository.save({ ...preview, status: "CONFIRMED", confirmedAt: now }, activeTenantContext);
  MemberStateRepository.save({
    member_id: preview.outgoingMemberId,
    group_id: preview.groupId,
    status: "REPLACED",
    replaced_by_member_id: preview.incomingMemberId,
    updated_at: now,
  }, activeTenantContext);
  MemberStateRepository.save({
    member_id: preview.incomingMemberId,
    group_id: preview.groupId,
    status: "ACTIVE_NON_LIFTED",
    replacement_for_member_id: preview.outgoingMemberId,
    joined_month: preview.effectiveMonth,
    updated_at: now,
  }, activeTenantContext);
  return { success: true, replacement };
}
