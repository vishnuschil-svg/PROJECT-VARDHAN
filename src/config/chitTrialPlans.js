/** Versioned MITRA NIDHI controlled-trial subscription plans. */

export const CHIT_TRIAL_PLAN_CATALOG_VERSION = "chit-trial-plans.v1";

export const CHIT_TRIAL_PLANS = Object.freeze([
  Object.freeze({
    id: "trial-99",
    version: CHIT_TRIAL_PLAN_CATALOG_VERSION,
    label: "Starter Trial",
    priceInr: 99,
    durationDays: 30,
    maxActiveChits: 1,
    unlimited: false,
  }),
  Object.freeze({
    id: "trial-199",
    version: CHIT_TRIAL_PLAN_CATALOG_VERSION,
    label: "Growth Trial",
    priceInr: 199,
    durationDays: 30,
    maxActiveChits: 3,
    unlimited: false,
  }),
  Object.freeze({
    id: "trial-299",
    version: CHIT_TRIAL_PLAN_CATALOG_VERSION,
    label: "Unlimited Trial",
    priceInr: 299,
    durationDays: 30,
    maxActiveChits: null,
    unlimited: true,
  }),
]);

export function getTrialPlanById(planId) {
  return CHIT_TRIAL_PLANS.find((plan) => plan.id === planId) || null;
}

export function resolveMaxActiveChits(planId, fallback = 10) {
  const plan = getTrialPlanById(planId);
  if (!plan) return fallback;
  if (plan.unlimited) return Number.POSITIVE_INFINITY;
  return Number(plan.maxActiveChits);
}

/**
 * Completed/archived/closed groups do not consume active slots.
 */
export function countActiveChits(groups = []) {
  return groups.filter((group) => {
    const status = String(group.status || "").toLowerCase();
    return status === "active" || status === "upcoming";
  }).length;
}

export function canActivateAnotherChit({ groups = [], planId, fallbackMax = 10 } = {}) {
  const max = resolveMaxActiveChits(planId, fallbackMax);
  if (!Number.isFinite(max)) return { allowed: true, used: countActiveChits(groups), max: null };
  const used = countActiveChits(groups);
  return { allowed: used < max, used, max };
}

export function isTrialExpired(subscription = {}) {
  const expiresOn = subscription.expiresOn || subscription.expires_on || subscription.trialEndsAt;
  if (!expiresOn) return false;
  const end = new Date(expiresOn);
  if (Number.isNaN(end.getTime())) return false;
  return end.getTime() < Date.now();
}

export function trialAccessMode(subscription = {}) {
  if (isTrialExpired(subscription)) {
    return {
      mode: "READ_ONLY",
      message: "Trial expired. Data is preserved. Renew to restore write access.",
    };
  }
  const status = String(subscription.status || "trial").toLowerCase();
  if (["active", "trial"].includes(status)) {
    return { mode: "READ_WRITE", message: "" };
  }
  return {
    mode: "READ_ONLY",
    message: "Subscription is not active. Data is preserved.",
  };
}
