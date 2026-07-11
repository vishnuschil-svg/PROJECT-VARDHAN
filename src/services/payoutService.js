import { PayoutEngine } from "../domain/chit/services/PayoutEngine.js";
import { PayoutRepository } from "../repositories/PayoutRepository.js";
import { FinanceRepository } from "../repositories/chits/FinanceRepository.js";

export function createPayoutPlan(input, activeTenantContext) {
  const plan = PayoutEngine.createPlan(input);
  return PayoutRepository.save(plan, activeTenantContext);
}

export function recordPayoutPayment(plan, amount, paymentMode, activeTenantContext) {
  const updated = PayoutRepository.save(PayoutEngine.applyPayment(plan, amount), activeTenantContext);
  const isBank = !["CASH"].includes(String(paymentMode || "").toUpperCase());
  FinanceRepository.upsert({
    id: `payout-payment-${updated.id}-${Date.now()}`,
    type: "payout",
    category: "Winner Payout",
    amount: Number(amount || 0),
    cash_out: isBank ? 0 : Number(amount || 0),
    bank_out: isBank ? Number(amount || 0) : 0,
    payment_mode: paymentMode,
    status: "Posted",
    date: new Date().toISOString().slice(0, 10),
  }, { activeTenantContext });
  return updated;
}

export function listPayoutPlans(activeTenantContext) {
  return PayoutRepository.list(activeTenantContext);
}
