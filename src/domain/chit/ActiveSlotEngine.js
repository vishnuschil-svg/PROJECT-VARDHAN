export const ActiveSlotEngine = {
  buildSlotState({ groups = [], maxActiveSlots = 10 } = {}) {
    const activeGroups = groups.filter((group) => {
      const status = String(group.status || "").toLowerCase();
      return status === "active" || status === "upcoming";
    });
    const completedOrArchived = groups.filter((group) =>
      ["closed", "archived", "completed"].includes(String(group.status || "").toLowerCase())
    );
    const max = Number.isFinite(Number(maxActiveSlots)) ? Number(maxActiveSlots) : Number.POSITIVE_INFINITY;

    return {
      maxActiveSlots: Number.isFinite(max) ? max : null,
      activeSlotsUsed: activeGroups.length,
      reusableSlots: Number.isFinite(max) ? Math.max(0, max - activeGroups.length) : null,
      reusableFromArchive: completedOrArchived.length,
      canReuseActiveSlot: !Number.isFinite(max) || activeGroups.length < max,
    };
  },
};
