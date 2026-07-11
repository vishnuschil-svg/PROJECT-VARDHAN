import { ChitScheduleRow, ALLOCATION_TYPES, WINNER_SELECTION_MODES } from "../entities/ChitScheduleRow.js";

export const ScheduleEngine = {
  fromLegacyGroup(group = {}, context = {}) {
    const totalMonths = Number(group.total_months || group.totalMonths || group.total_members || group.totalMembers || 0);
    const amount = Number(group.monthly_amount || group.monthlyAmount || 0);
    return this.generateRows({
      ...context,
      groupId: group.id || context.groupId,
      totalMonths,
      standardPayment: amount,
      nonLiftedPayment: amount,
      liftedPayment: amount,
      chitValue: Number(group.chit_value || group.chitValue || 0),
      sourceType: "LEGACY_FIXED_ADAPTER",
      isUserConfirmed: true,
    });
  },

  generateRows(input = {}) {
    const months = Math.max(Number(input.totalMonths || input.duration || 0), 0);
    const standardPayment = Number(input.standardPayment || input.monthlyAmount || 0);
    return Array.from({ length: months }, (_, index) => {
      const monthNumber = index + 1;
      return new ChitScheduleRow({
        ...input,
        id: input.id ? `${input.id}-${monthNumber}` : undefined,
        monthNumber,
        standardPayment,
        nonLiftedPayment: input.nonLiftedPayment ?? standardPayment,
        liftedPayment: input.liftedPayment ?? standardPayment,
        dailyCollectionAmount: input.dailyCollectionAmount ?? Math.round((standardPayment / 30) * 100) / 100,
        prizeAmount: input.prizeAmount ?? Math.max(0, Number(input.chitValue || 0) - Number(input.commissionAmount || 0)),
        payoutAmount: input.payoutAmount ?? Math.max(0, Number(input.chitValue || 0) - Number(input.commissionAmount || 0)),
        commissionType: input.commissionType || "PERCENTAGE",
        commissionValue: input.commissionValue ?? input.commission ?? 5,
        allocationType: monthNumber === Number(input.companyMonth || 0) ? ALLOCATION_TYPES.COMPANY_CHIT : ALLOCATION_TYPES.NORMAL,
        winnerSelectionMode: monthNumber === Number(input.companyMonth || 0) ? WINNER_SELECTION_MODES.COMPANY : input.winnerSelectionMode || WINNER_SELECTION_MODES.AUCTION,
        sourceType: input.sourceType || "GENERATED",
        confidence: input.confidence || "HIGH",
      }).toJSON();
    });
  },

  copyValueToAll(schedule = [], field, value) {
    return schedule.map((row) => ({ ...row, [field]: Number(value || 0), isManuallyOverridden: true }));
  },

  copyPreviousMonth(schedule = [], monthNumber) {
    return schedule.map((row) => {
      if (Number(row.monthNumber) !== Number(monthNumber)) return row;
      const previous = schedule.find((item) => Number(item.monthNumber) === Number(monthNumber) - 1);
      return previous ? { ...row, ...pickScheduleValues(previous), monthNumber: row.monthNumber, monthLabel: row.monthLabel, id: row.id } : row;
    });
  },

  applyRange(schedule = [], { startMonth, endMonth, patch = {} } = {}) {
    return schedule.map((row) =>
      Number(row.monthNumber) >= Number(startMonth) && Number(row.monthNumber) <= Number(endMonth)
        ? { ...row, ...patch, isManuallyOverridden: true }
        : row
    );
  },

  applyPercentageChange(schedule = [], field, percentage = 0) {
    return schedule.map((row) => ({
      ...row,
      [field]: round(Number(row[field] || 0) * (1 + Number(percentage || 0) / 100)),
      isManuallyOverridden: true,
    }));
  },

  markSpecialMonth(schedule = [], monthNumber, allocationType = ALLOCATION_TYPES.COMPANY_CHIT) {
    return schedule.map((row) =>
      Number(row.monthNumber) === Number(monthNumber)
        ? { ...row, allocationType, winnerSelectionMode: allocationType === ALLOCATION_TYPES.COMPANY_CHIT ? WINNER_SELECTION_MODES.COMPANY : row.winnerSelectionMode }
        : row
    );
  },
};

function pickScheduleValues(row) {
  const {
    standardPayment,
    nonLiftedPayment,
    liftedPayment,
    dailyCollectionAmount,
    prizeAmount,
    payoutAmount,
    bidAmount,
    bidPercentage,
    dividendPerMember,
    commissionType,
    commissionValue,
    commissionAmount,
    organizerProfit,
    memberBenefit,
    allocationType,
    winnerSelectionMode,
  } = row;
  return {
    standardPayment,
    nonLiftedPayment,
    liftedPayment,
    dailyCollectionAmount,
    prizeAmount,
    payoutAmount,
    bidAmount,
    bidPercentage,
    dividendPerMember,
    commissionType,
    commissionValue,
    commissionAmount,
    organizerProfit,
    memberBenefit,
    allocationType,
    winnerSelectionMode,
  };
}

function round(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}
