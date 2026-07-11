export const AIClarificationEngine = {
  buildQuestions(capture = {}) {
    const questions = [];
    const fields = capture.fields || {};
    if (!fields.monthWisePattern?.value?.length) questions.push("Is the schedule fixed monthly, month-wise variable, or lifted/non-lifted?");
    if (!fields.prizeAmount?.value) questions.push("Does payout mean prize amount or net amount after commission?");
    if (!fields.commission?.value) questions.push("Is commission fixed, percentage, or already deducted?");
    if (!fields.liftedAmounts?.value?.length) questions.push("After lifting, does the new payment start in the same month or next month?");
    questions.push("Are blank values zero, not applicable, or company month?");
    return questions.map((question, index) => ({ id: `clarification-${index + 1}`, question, answer: "", confirmed: false }));
  },
};
