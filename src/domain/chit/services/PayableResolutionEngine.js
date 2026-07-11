import { MemberStateEngine } from "./MemberStateEngine.js";

export const PayableResolutionEngine = {
  resolve({
    group = {},
    ruleSet = {},
    scheduleRow = {},
    memberState = {},
    installmentMonth = 1,
    previousPayments = [],
    pendingBalance = 0,
    advanceBalance = 0,
    penaltyAmount = 0,
    manualAdjustment = 0,
    overrides = [],
  } = {}) {
    const isLifted = MemberStateEngine.isLiftedForMonth(memberState, installmentMonth);
    const baseAmount = Number(scheduleRow.standardPayment || group.monthly_amount || group.monthlyAmount || 0);
    const scheduleAmount = isLifted
      ? Number(scheduleRow.liftedPayment || baseAmount)
      : Number(scheduleRow.nonLiftedPayment || baseAmount);
    const alreadyPaid = previousPayments.reduce((sum, row) => sum + Number(row.paid_amount || row.paidAmount || 0), 0);
    const pendingCarryForward = Number(pendingBalance || 0);
    const advanceAdjustment = Number(advanceBalance || 0);
    const finalPayable = Math.max(
      scheduleAmount + pendingCarryForward + Number(penaltyAmount || 0) + Number(manualAdjustment || 0) - advanceAdjustment - alreadyPaid,
      0
    );
    const explanation = buildExplanation({
      memberState,
      scheduleRow,
      installmentMonth,
      isLifted,
      scheduleAmount,
      baseAmount,
      pendingCarryForward,
      advanceAdjustment,
      penaltyAmount,
      manualAdjustment,
      alreadyPaid,
      finalPayable,
      ruleSet,
    });

    return {
      baseAmount,
      scheduleAmount,
      memberStateAdjustment: isLifted ? scheduleAmount - baseAmount : 0,
      liftedAdjustment: isLifted ? scheduleAmount - Number(scheduleRow.nonLiftedPayment || baseAmount) : 0,
      pendingCarryForward,
      advanceAdjustment,
      penaltyAmount: Number(penaltyAmount || 0),
      manualAdjustment: Number(manualAdjustment || 0),
      alreadyPaid,
      finalPayable,
      explanation,
      ruleTrace: [
        `paymentPatternType=${ruleSet.paymentPatternType || "FIXED"}`,
        `liftEffectiveRule=${ruleSet.liftEffectiveRule || "NEXT_MONTH"}`,
        `scheduleRow=${scheduleRow.id || scheduleRow.monthLabel || "legacy"}`,
      ],
      warnings: overrides.length ? ["Manual override is applied. Review audit trail before saving."] : [],
      sourceReferences: {
        groupId: group.id || "",
        scheduleRowId: scheduleRow.id || "",
        memberState: memberState.status || "",
      },
    };
  },
};

function buildExplanation(input) {
  const parts = [
    `Month ${input.installmentMonth} uses ${input.isLifted ? "lifted" : "non-lifted"} schedule amount ${input.scheduleAmount}.`,
  ];
  if (input.memberState.liftMonth) {
    parts.push(`This member lifted in Month ${input.memberState.liftMonth}; ${input.ruleSet.liftEffectiveRule || "NEXT_MONTH"} is applied.`);
  }
  if (input.pendingCarryForward) parts.push(`Pending carry-forward added: ${input.pendingCarryForward}.`);
  if (input.advanceAdjustment) parts.push(`Advance adjustment deducted: ${input.advanceAdjustment}.`);
  if (input.penaltyAmount) parts.push(`Penalty added: ${input.penaltyAmount}.`);
  if (input.manualAdjustment) parts.push(`Manual adjustment applied: ${input.manualAdjustment}.`);
  if (input.alreadyPaid) parts.push(`Already paid for this installment: ${input.alreadyPaid}.`);
  parts.push(`Final payable is ${input.finalPayable}.`);
  return parts.join(" ");
}
