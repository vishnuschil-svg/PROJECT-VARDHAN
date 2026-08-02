import { PayoutEngine } from "../domain/chit/services/PayoutEngine.js";
import { PayoutRepository } from "../repositories/PayoutRepository.js";
import {
  listPayoutsPersistent,
  recordPayoutPaymentPersistent,
} from "./winnerLifecyclePersistence.js";
import {
  createEntityId,
  fromProductionPayout,
  isUuid,
  toProductionPayout,
} from "./productionChitPersistence.js";
import { resolveRepositoryBackend, REPOSITORY_BACKENDS } from "../config/repositoryBackend.js";
import { createRepositoryProvider } from "../repositories/repositoryProvider.js";
import { assertOperatorRole } from "./winnerLifecyclePersistence.js";

export async function createPayoutPlan(input, activeTenantContext, { permissions = {}, profile = {}, role = "" } = {}) {
  if (!assertOperatorRole(permissions, profile, role)) {
    throw new Error("Unauthorized role for payout plan creation.");
  }

  const plan = PayoutEngine.createPlan({
    ...input,
    id: isUuid(input?.id) ? input.id : createEntityId(),
  });

  if (resolveRepositoryBackend() === REPOSITORY_BACKENDS.LOCAL) {
    return fromProductionPayout(PayoutRepository.save(plan, activeTenantContext));
  }

  const payload = toProductionPayout({
    ...plan,
    reference_no: plan.reference_no || `payout-plan:${plan.winnerResultId || plan.winnerId || plan.id}`,
    idempotency_key: `payout-create:${plan.winnerResultId || plan.winnerId || plan.id}`,
  });

  const existing = await listPayoutsPersistent(activeTenantContext);
  const duplicate = existing.find(
    (row) =>
      (row.reference_no && row.reference_no === payload.reference_no) ||
      (payload.winner_id && (row.winner_id || row.winnerId) === payload.winner_id &&
        String(row.status || "").toUpperCase() !== "CANCELLED")
  );
  if (duplicate) {
    return fromProductionPayout(duplicate);
  }

  const result = await createRepositoryProvider().PayoutRepository.create(payload, {
    activeTenantContext,
  });
  if (!result.success) {
    throw new Error(result.message || "Payout plan could not be saved.");
  }
  return fromProductionPayout(result.data);
}

export async function recordPayoutPayment(
  plan,
  amount,
  paymentMode,
  activeTenantContext,
  options = {}
) {
  if (!assertOperatorRole(options.permissions || {}, options.profile || {}, options.role || "")) {
    throw new Error("Unauthorized role for payout payment.");
  }
  const result = await recordPayoutPaymentPersistent(
    plan,
    amount,
    paymentMode,
    activeTenantContext,
    options
  );
  return result.payout;
}

export async function listPayoutPlans(activeTenantContext) {
  return listPayoutsPersistent(activeTenantContext);
}
