import { PayoutEngine } from "../domain/chit/services/PayoutEngine.js";
import { PayoutRepository } from "../repositories/PayoutRepository.js";
import { saveFinanceEntryPersistent } from "./chitDataService.js";
import { createEntityId, isUuid } from "./productionChitPersistence.js";

export function createPayoutPlan(input, activeTenantContext) {
  const plan = PayoutEngine.createPlan(input);
  return PayoutRepository.save(plan, activeTenantContext);
}

export async function recordPayoutPayment(plan, amount, paymentMode, activeTenantContext) {
  const updated = PayoutRepository.save(PayoutEngine.applyPayment(plan, amount), activeTenantContext);
  const isBank = !["CASH"].includes(String(paymentMode || "").toUpperCase());
  await saveFinanceEntryPersistent({
    id: createEntityId(),
    type: "payout",
    entry_type: "payout",
    category: "Winner Payout",
    amount: Number(amount || 0),
    cash_out: isBank ? 0 : Number(amount || 0),
    bank_out: isBank ? Number(amount || 0) : 0,
    payment_mode: paymentMode,
    status: "Posted",
    date: new Date().toISOString().slice(0, 10),
    entry_date: new Date().toISOString().slice(0, 10),
    group_id: isUuid(updated.group_id) ? updated.group_id : null,
    member_id: isUuid(updated.member_id) ? updated.member_id : null,
    metadata: { payout_plan_id: updated.id },
  }, activeTenantContext);
  return updated;
}

export function listPayoutPlans(activeTenantContext) {
  return PayoutRepository.list(activeTenantContext);
}
