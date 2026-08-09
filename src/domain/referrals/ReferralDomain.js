import { addCalendarMonthsClamped } from "../subscriptions/CalendarMonth.js";

export const REFERRAL_REWARD_MONTHS = 2;
export const REFERRAL_STATES = Object.freeze(["PENDING", "QUALIFIED", "REWARDED", "REJECTED", "REVERSED"]);

export function qualifyReferral({ referral, payment, referrerSubscription }) {
  if (!referral || referral.referrerUserId === referral.referredUserId) throw new Error("SELF_REFERRAL_BLOCKED");
  if (referral.state !== "PENDING") return referral;
  if (!payment?.signatureVerified || payment.status !== "SUCCESS" || payment.billingPeriod !== "ANNUAL" || !payment.isFirstSuccessfulPayment) {
    throw new Error("REFERRAL_PAYMENT_NOT_QUALIFYING");
  }
  if (!referrerSubscription?.entitlementEndsAt) throw new Error("REFERRER_SUBSCRIPTION_REQUIRED");
  return Object.freeze({ ...referral, state: "REWARDED", rewardMonths: REFERRAL_REWARD_MONTHS });
}

export function extendReferralEntitlement(currentExpiry, now = new Date()) {
  const current = new Date(currentExpiry);
  const base = current > now ? current : now;
  return addCalendarMonthsClamped(base, REFERRAL_REWARD_MONTHS);
}

export function rewardMonthsForVerifiedReferrals(count) {
  return Math.max(0, Math.trunc(Number(count) || 0)) * REFERRAL_REWARD_MONTHS;
}

export function buildReferralLink(origin, code) {
  const url = new URL("/register", origin);
  url.searchParams.set("ref", String(code || "").trim().toUpperCase());
  return url.toString();
}

export function buildWhatsAppReferralLink(referralLink) {
  const text = `Try MITRA NIDHI CHITI PRO for secure chit management: ${referralLink}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
