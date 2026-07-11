export const AIChitPlanDesigner = {
  design(input = {}) {
    const chitValue = Number(input.chitValue || 0);
    const members = Number(input.members || 0);
    const duration = Number(input.duration || members || 0);
    const commissionRate = Number(input.commission || 0);
    const auctionType = input.auctionType || "Auction";
    const installment = members > 0 ? Math.round(chitValue / members) : 0;
    const schedule = Array.from({ length: duration }, (_, index) => {
      const month = index + 1;
      const discountRate = Math.max(0, Math.min(30, Number(input.discountRate || 10) - index));
      const discount = Math.round((chitValue * discountRate) / 100);
      const commission = Math.round((chitValue * commissionRate) / 100);
      const prizeAmount = Math.max(0, chitValue - discount - commission);
      const dividendPool = Math.max(0, discount - commission);
      const dividend = members > 0 ? Math.round(dividendPool / members) : 0;
      const ownerProfit = commission;

      return {
        month,
        auctionType,
        installment,
        discount,
        commission,
        prizeAmount,
        dividend,
        memberBenefit: dividend,
        ownerProfit,
      };
    });
    const validation = validatePlan({ chitValue, members, duration, installment, schedule });

    return {
      input: { chitValue, members, duration, commission: commissionRate, auctionType },
      schedule,
      totals: {
        collection: installment * members,
        prize: schedule.reduce((sum, row) => sum + row.prizeAmount, 0),
        discount: schedule.reduce((sum, row) => sum + row.discount, 0),
        dividend: schedule.reduce((sum, row) => sum + row.dividend * members, 0),
        commission: schedule.reduce((sum, row) => sum + row.commission, 0),
        ownerProfit: schedule.reduce((sum, row) => sum + row.ownerProfit, 0),
      },
      validation,
    };
  },
};

function validatePlan({ chitValue, members, duration, installment, schedule }) {
  const errors = [];
  const warnings = [];

  if (chitValue <= 0) errors.push("Chit value must be greater than zero.");
  if (members <= 0) errors.push("Members must be greater than zero.");
  if (duration <= 0) errors.push("Duration must be greater than zero.");
  if (installment <= 0) errors.push("Installment must be greater than zero.");
  if (duration !== members) warnings.push("Duration differs from member count; verify chit rules before activation.");
  if (schedule.some((row) => row.prizeAmount < 0)) errors.push("Prize amount cannot be negative.");

  return { isValid: errors.length === 0, errors, warnings };
}
