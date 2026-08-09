import { addCalendarMonthsClamped } from "./CalendarMonth.js";
import { createImmutablePlanSnapshot } from "./VardhanPlanCatalog.js";

export const SUBSCRIPTION_STATES = Object.freeze(["TRIAL", "PENDING", "ACTIVE", "PAST_DUE", "GRACE", "EXPIRED", "CANCELLED"]);

export function resolveSubscriptionState(subscription, now = new Date()) {
  if (!subscription) return "EXPIRED";
  if (["CANCELLED", "PAST_DUE", "PENDING", "TRIAL"].includes(subscription.state)) return subscription.state;
  return subscription.entitlementEndsAt && new Date(subscription.entitlementEndsAt) >= now ? "ACTIVE" : "EXPIRED";
}

export function activateVerifiedAnnualPayment({ subscription, payment, now = new Date() }) {
  if (!payment?.signatureVerified || payment.status !== "SUCCESS") throw new Error("UNVERIFIED_PAYMENT");
  if (!payment.idempotencyKey) throw new Error("PAYMENT_IDEMPOTENCY_KEY_REQUIRED");
  if (subscription?.processedPaymentKeys?.includes(payment.idempotencyKey)) return subscription;

  const plan = createImmutablePlanSnapshot(payment.planCode);
  if (payment.amountPaise !== plan.pricePaise || payment.currency !== plan.currency) throw new Error("PAYMENT_AMOUNT_MISMATCH");
  const paidThrough = addCalendarMonthsClamped(
    subscription?.paidEntitlementEndsAt && new Date(subscription.paidEntitlementEndsAt) > now
      ? subscription.paidEntitlementEndsAt
      : now,
    12
  ).toISOString();
  return Object.freeze({
    ...subscription,
    state: "ACTIVE",
    planSnapshot: plan,
    paidEntitlementEndsAt: paidThrough,
    entitlementEndsAt: paidThrough,
    processedPaymentKeys: [...(subscription?.processedPaymentKeys || []), payment.idempotencyKey],
  });
}
