export const ActiveSlotEngine = {
  buildSlotState({ groups = [], maxActiveSlots = 10 } = {}) {
    const activeGroups = groups.filter((group) => String(group.status || "").toLowerCase() === "active");
    const completedOrArchived = groups.filter((group) =>
      ["closed", "archived"].includes(String(group.status || "").toLowerCase())
    );

    return {
      maxActiveSlots,
      activeSlotsUsed: activeGroups.length,
      reusableSlots: Math.max(0, Number(maxActiveSlots || 0) - activeGroups.length),
      reusableFromArchive: completedOrArchived.length,
      canReuseActiveSlot: activeGroups.length < Number(maxActiveSlots || 0) || completedOrArchived.length > 0,
    };
  },
};
