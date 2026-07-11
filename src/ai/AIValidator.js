import { createAssistantResponse } from "./AIContext.js";

export function validateAIRequest(request = {}) {
  const errors = [];

  if (!request.type) errors.push("Request type is required.");
  if (!request.context) errors.push("AI context is required.");

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateBusinessData(context) {
  const responses = [];
  const groups = context.source.groups || [];
  const members = context.source.members || [];

  if (!groups.length) {
    responses.push(createAssistantResponse({
      id: "validation-no-groups",
      type: "DATA_VALIDATION",
      title: "No chit groups found",
      message: "Create at least one chit group before relying on collection and auction intelligence.",
      action: { label: "Open chit groups", route: "/chits/groups" },
      confidence: 0.9,
      severity: "warning",
    }));
  }

  const incompleteMembers = members.filter((member) =>
    !member.member_name || !member.mobile_number || !member.chit_group_id
  );

  if (incompleteMembers.length) {
    responses.push(createAssistantResponse({
      id: "validation-incomplete-members",
      type: "DATA_VALIDATION",
      title: "Member records need completion",
      message: `${incompleteMembers.length} member records are missing core profile or group assignment data.`,
      action: { label: "Open members", route: "/chits/members" },
      confidence: 0.86,
      severity: "warning",
    }));
  }

  return responses.length ? responses : [
    createAssistantResponse({
      id: "validation-clean",
      type: "DATA_VALIDATION",
      title: "Business data is ready",
      message: "No blocking validation issues were detected in the current AI context.",
      action: { label: "Open dashboard", route: "/dashboard" },
      confidence: 0.82,
      severity: "success",
    }),
  ];
}
