export const SIMULATION_STATUS = Object.freeze({ PASS: "PASS", FAIL: "FAIL" });

export function simulateBusinessDSL(model) {
  const warnings = [];
  const errors = [];

  if (!isBusinessDSLModel(model)) {
    return report(SIMULATION_STATUS.FAIL, [], warnings, ["BusinessDSLModel is required."]);
  }

  const memberCount = positiveNumber(valueOf(model.Business.memberCount), "Business.memberCount", errors);
  const schedule = model.Schedule.map((row, index) => simulateMonth(row, index, memberCount, warnings, errors));

  if (schedule.length === 0) errors.push("Schedule must contain at least one month.");

  const totals = schedule.reduce((sum, month) => ({
    monthlyCollections: sum.monthlyCollections + month.monthlyCollection,
    prizeAmount: sum.prizeAmount + month.prizeAmount,
    lift: sum.lift + month.liftAmount,
    dividend: sum.dividend + month.dividend,
    commission: sum.commission + month.commission,
    penalty: sum.penalty + month.penalty,
  }), { monthlyCollections: 0, prizeAmount: 0, lift: 0, dividend: 0, commission: 0, penalty: 0 });

  const ownerProfit = totals.commission + totals.penalty;
  return report(errors.length ? SIMULATION_STATUS.FAIL : SIMULATION_STATUS.PASS, schedule, warnings, errors, {
    ...totals,
    ownerProfit,
  });
}

function simulateMonth(row, index, memberCount, warnings, errors) {
  const monthNumber = numberOrZero(valueOf(row.monthNumber));
  const payment = optionalNonNegative(valueOf(row.standardPayment), `Schedule[${index}].standardPayment`, warnings, errors);
  const monthlyCollection = payment * memberCount;
  const prizeAmount = optionalNonNegative(valueOf(row.prizeAmount), `Schedule[${index}].prizeAmount`, warnings, errors);
  const liftedPayment = optionalNonNegative(valueOf(row.liftedPayment), `Schedule[${index}].liftedPayment`, warnings, errors);
  const liftAmount = liftedPayment;
  const dividend = optionalNonNegative(valueOf(row.dividendPerMember), `Schedule[${index}].dividendPerMember`, warnings, errors) * memberCount;
  const commission = optionalNonNegative(valueOf(row.commissionValue), `Schedule[${index}].commissionValue`, warnings, errors);
  const penalty = optionalNonNegative(valueOf(row.penalty), `Schedule[${index}].penalty`, warnings, errors);

  return Object.freeze({
    monthNumber,
    monthlyCollection,
    prizeAmount,
    liftAmount,
    dividend,
    commission,
    penalty,
  });
}

function report(status, monthlyCollections, warnings, errors, totals = {}) {
  return Object.freeze({
    status,
    monthlyCollections,
    prizeAmount: totals.prizeAmount || 0,
    lift: totals.lift || 0,
    dividend: totals.dividend || 0,
    commission: totals.commission || 0,
    penalty: totals.penalty || 0,
    ownerProfit: totals.ownerProfit || 0,
    totals: Object.freeze({ monthlyCollections: totals.monthlyCollections || 0, ...totals }),
    warnings: Object.freeze([...warnings]),
    errors: Object.freeze([...errors]),
  });
}

function valueOf(field) {
  return field?.originalValue ?? null;
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function positiveNumber(value, source, errors) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    errors.push(`${source} must be greater than zero.`);
    return 0;
  }
  return number;
}

function optionalNonNegative(value, source, warnings, errors) {
  if (value === null || value === undefined || value === "") {
    warnings.push(`${source} is not configured; zero is used for simulation only.`);
    return 0;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    errors.push(`${source} must be a non-negative number.`);
    return 0;
  }
  return number;
}

function isBusinessDSLModel(model) {
  return Boolean(model && typeof model === "object" && model.Business && Array.isArray(model.Schedule));
}

export const SimulationEngine = Object.freeze({ simulate: simulateBusinessDSL });
export default SimulationEngine;
