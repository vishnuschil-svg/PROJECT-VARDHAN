export const ChitArchiveEngine = {
  canComplete(group = {}, lifecycle = {}) {
    const totalMonths = Number(group.total_months || group.totalMonths || 0);
    const currentMonth = Number(lifecycle.currentRunningMonth || 0);
    const completionPercent = Number(lifecycle.completionPercent || 0);
    const errors = [];

    if (currentMonth < totalMonths) errors.push("Cannot complete chit before final month.");
    if (completionPercent < 100) errors.push("Cannot complete chit before lifecycle reaches 100%.");

    return {
      canComplete: errors.length === 0,
      errors,
    };
  },

  buildArchiveState(group = {}, lifecycle = {}) {
    const completion = this.canComplete(group, lifecycle);
    const isArchived = String(group.status || "").toLowerCase() === "archived";

    return {
      canArchive: completion.canComplete && !isArchived,
      isArchived,
      archiveReason: completion.errors[0] || "Ready for archive.",
    };
  },
};
