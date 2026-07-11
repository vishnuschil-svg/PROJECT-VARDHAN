export const ManualOverrideEngine = {
  createOverride({
    originalValue,
    newValue,
    reason,
    userId,
    affectedMonth,
    affectedMemberId,
    targetType,
    targetId,
    requiresApproval = false,
  } = {}) {
    return {
      id: `override-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      originalValue,
      newValue,
      reason: reason || "Owner correction",
      userId: userId || "local-user",
      timestamp: new Date().toISOString(),
      affectedMonth,
      affectedMemberId,
      targetType,
      targetId,
      requiresApproval,
      status: requiresApproval ? "PENDING_APPROVAL" : "CONFIRMED",
    };
  },
};
