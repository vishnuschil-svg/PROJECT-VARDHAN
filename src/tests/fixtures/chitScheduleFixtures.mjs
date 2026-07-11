export const oneLakhTwentyMonthLiftedFixture = {
  group: { id: "fixture-group-1", chit_value: 100000, monthly_amount: 5000, total_members: 20, total_months: 20, status: "active" },
  ruleSet: {
    paymentPatternType: "LIFTED_NON_LIFTED",
    liftEffectiveRule: "NEXT_MONTH",
    winnerLockRule: "ONCE_LIFTED_LOCKED",
    commissionType: "PERCENTAGE",
    commissionValue: 5,
  },
  scheduleRowMonth5: {
    id: "row-5",
    monthNumber: 5,
    standardPayment: 5000,
    nonLiftedPayment: 5000,
    liftedPayment: 6000,
    payoutAmount: 99000,
    confidence: "HIGH",
    isUserConfirmed: true,
  },
  liftedMemberState: {
    memberId: "member-1",
    groupId: "fixture-group-1",
    status: "ACTIVE_LIFTED",
    liftMonth: 4,
    liftEffectiveMonth: 5,
    isWinnerLocked: true,
  },
};

export const twoLakhCompanyMonthFixture = {
  schedule: [
    { monthNumber: 1, standardPayment: 10000, nonLiftedPayment: 10000, payoutAmount: 0, allocationType: "COMPANY_CHIT", winnerSelectionMode: "COMPANY", confidence: "HIGH", isUserConfirmed: true },
    { monthNumber: 2, standardPayment: 10500, nonLiftedPayment: 10500, payoutAmount: 185000, bidPercentage: 7.5, dividendPerMember: 400, confidence: "HIGH", isUserConfirmed: true },
  ],
  ruleSet: { paymentPatternType: "MONTH_WISE_VARIABLE", minimumBidValue: 5, maximumBidValue: 30, commissionType: "PERCENTAGE", commissionValue: 5 },
};
