export const ChitSimulationEngine = {
  simulate({ schedule = [], memberCount = 0, delayedMembers = 0, defaulters = 0, expenses = 0 } = {}) {
    const estimatedCollection = schedule.reduce((sum, row) => sum + Number(row.nonLiftedPayment || row.standardPayment || 0) * Number(memberCount || 0), 0);
    const estimatedPayoutObligation = schedule.reduce((sum, row) => sum + Number(row.payoutAmount || row.prizeAmount || 0), 0);
    const pendingExposure = schedule[0] ? Number(schedule[0].nonLiftedPayment || schedule[0].standardPayment || 0) * (Number(delayedMembers || 0) + Number(defaulters || 0)) : 0;
    const profitEstimate = estimatedCollection - estimatedPayoutObligation - Number(expenses || 0);
    const highRiskMonths = schedule
      .filter((row) => Number(row.payoutAmount || row.prizeAmount || 0) > Number(row.nonLiftedPayment || row.standardPayment || 0) * Number(memberCount || 0))
      .map((row) => row.monthNumber);

    return {
      advisory: "Simulation is an estimate based on entered assumptions.",
      estimatedCollection,
      estimatedPayoutObligation,
      cashFlowRisk: highRiskMonths.length || pendingExposure > 0 ? "REVIEW" : "LOW",
      pendingExposure,
      profitEstimate,
      highRiskMonths,
      ruleConflicts: [],
    };
  },
};
