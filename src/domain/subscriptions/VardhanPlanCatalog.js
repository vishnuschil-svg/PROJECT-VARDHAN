export const VARDHAN_PLAN_CATALOG_VERSION = 1;
export const VARDHAN_PRODUCT_ID = "chit_management";
export const VARDHAN_BILLING_PERIOD = "ANNUAL";

export const VARDHAN_ANNUAL_PLANS = Object.freeze([
  Object.freeze({ code: "STARTER", name: "Starter", pricePaise: 149900, currency: "INR", billingPeriod: VARDHAN_BILLING_PERIOD, maxActiveChits: 1, version: VARDHAN_PLAN_CATALOG_VERSION }),
  Object.freeze({ code: "GROWTH", name: "Growth", pricePaise: 299900, currency: "INR", billingPeriod: VARDHAN_BILLING_PERIOD, maxActiveChits: 3, version: VARDHAN_PLAN_CATALOG_VERSION }),
  Object.freeze({ code: "BUSINESS", name: "Business", pricePaise: 499900, currency: "INR", billingPeriod: VARDHAN_BILLING_PERIOD, maxActiveChits: null, version: VARDHAN_PLAN_CATALOG_VERSION }),
]);

export function getVardhanPlan(code) {
  const normalized = String(code || "").trim().toUpperCase();
  return VARDHAN_ANNUAL_PLANS.find((plan) => plan.code === normalized) || null;
}

export function createImmutablePlanSnapshot(code) {
  const plan = getVardhanPlan(code);
  if (!plan) throw new Error("UNKNOWN_SUBSCRIPTION_PLAN");
  return Object.freeze({ ...plan });
}

export function formatAnnualPrice(pricePaise) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(pricePaise / 100);
}

export function canActivateAnotherChit({ planCode, activeChitCount }) {
  const plan = getVardhanPlan(planCode);
  if (!plan) return { allowed: false, code: "SUBSCRIPTION_REQUIRED" };
  if (plan.maxActiveChits === null) return { allowed: true, remaining: null };
  const used = Math.max(0, Number(activeChitCount) || 0);
  return used < plan.maxActiveChits
    ? { allowed: true, remaining: plan.maxActiveChits - used }
    : { allowed: false, code: "PLAN_ACTIVE_CHIT_LIMIT_REACHED", limit: plan.maxActiveChits };
}
