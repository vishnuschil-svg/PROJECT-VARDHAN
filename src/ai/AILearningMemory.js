export const AILearningMemory = {
  suggest(preferences = []) {
    return preferences.map((preference) => ({
      ...preference,
      message: `Based on your previous confirmed template, ${preference.key} is usually ${preference.value}.`,
      actions: ["ACCEPT", "EDIT", "REJECT", "FORGET"],
    }));
  },
};
