import { PayoutPlan, PAYOUT_MODES } from "../entities/PayoutPlan.js";

export const PayoutEngine = {
  createPlan(input = {}) {
    const totalPayout = Number(input.totalPayout || input.payoutAmount || 0);
    const payoutMode = input.payoutMode || PAYOUT_MODES.FULL;
    const installmentCount = payoutMode === PAYOUT_MODES.INSTALLMENTS ? Number(input.installmentCount || 2) : 0;
    const installmentSchedule = payoutMode === PAYOUT_MODES.INSTALLMENTS
      ? buildInstallments(totalPayout, installmentCount, input.startDate)
      : input.installmentSchedule || [];
    return new PayoutPlan({ ...input, totalPayout, installmentCount, installmentSchedule }).toJSON();
  },

  applyPayment(plan = {}, amount = 0) {
    const paidAmount = Number(plan.paidAmount || 0) + Number(amount || 0);
    return new PayoutPlan({
      ...plan,
      paidAmount,
      status: resolvePaymentStatus(Number(plan.totalPayout || plan.total_payout || 0), paidAmount),
      updatedAt: new Date().toISOString(),
    }).toJSON();
  },

  reverse(plan = {}, { reason, userId = "local-owner" } = {}) {
    if (!reason) throw new Error("Payout reversal requires a reason.");
    return {
      ...plan,
      status: "CANCELLED",
      reversalReason: reason,
      reversedBy: userId,
      reversedAt: new Date().toISOString(),
    };
  },
};

function resolvePaymentStatus(totalPayout, paidAmount) {
  if (paidAmount <= 0) return "PENDING";
  if (paidAmount >= totalPayout) return "PAID";
  return "PARTIALLY_PAID";
}

function buildInstallments(total, count, startDate = new Date().toISOString().slice(0, 10)) {
  const amount = Math.round((Number(total || 0) / Math.max(count, 1)) * 100) / 100;
  return Array.from({ length: count }, (_, index) => ({
    installmentNumber: index + 1,
    dueDate: addMonths(startDate, index),
    amount,
    status: "PENDING",
  }));
}

function addMonths(date, offset) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + offset);
  return next.toISOString().slice(0, 10);
}
