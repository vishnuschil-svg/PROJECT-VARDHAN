import test from "node:test";
import assert from "node:assert/strict";
import { addCalendarMonthsClamped } from "../../domain/subscriptions/CalendarMonth.js";
import { VARDHAN_ANNUAL_PLANS, canActivateAnotherChit, createImmutablePlanSnapshot } from "../../domain/subscriptions/VardhanPlanCatalog.js";
import { activateVerifiedAnnualPayment } from "../../domain/subscriptions/SubscriptionDomain.js";
import { buildReferralLink, buildWhatsAppReferralLink, extendReferralEntitlement, qualifyReferral, rewardMonthsForVerifiedReferrals } from "../../domain/referrals/ReferralDomain.js";
import { aggregateCampaignEvents, selectEligibleCampaigns } from "../../domain/marketing/MarketingCampaign.js";
import { toChitPlanError } from "../../services/chitDataService.js";

test("annual catalog has exactly the three locked INR plans", () => {
  assert.deepEqual(VARDHAN_ANNUAL_PLANS.map(({ code, pricePaise, maxActiveChits }) => [code, pricePaise, maxActiveChits]), [["STARTER",149900,1],["GROWTH",299900,3],["BUSINESS",499900,null]]);
  assert.ok(VARDHAN_ANNUAL_PLANS.every((plan) => plan.billingPeriod === "ANNUAL"));
});

test("purchased plan snapshot is immutable", () => {
  const plan = createImmutablePlanSnapshot("starter");
  assert.throws(() => { plan.pricePaise = 1; }, TypeError);
});

test("active chit limits preserve completed and archived capacity semantics", () => {
  assert.equal(canActivateAnotherChit({ planCode: "STARTER", activeChitCount: 0 }).allowed, true);
  assert.equal(canActivateAnotherChit({ planCode: "STARTER", activeChitCount: 1 }).code, "PLAN_ACTIVE_CHIT_LIMIT_REACHED");
  assert.equal(canActivateAnotherChit({ planCode: "GROWTH", activeChitCount: 2 }).allowed, true);
  assert.equal(canActivateAnotherChit({ planCode: "BUSINESS", activeChitCount: 999 }).allowed, true);
});

test("calendar month policy clamps month ends deterministically", () => {
  assert.equal(addCalendarMonthsClamped("2025-01-31T10:30:00.000Z", 1).toISOString(), "2025-02-28T10:30:00.000Z");
  assert.equal(addCalendarMonthsClamped("2024-01-31T10:30:00.000Z", 1).toISOString(), "2024-02-29T10:30:00.000Z");
  assert.equal(addCalendarMonthsClamped("2024-02-29T10:30:00.000Z", 12).toISOString(), "2025-02-28T10:30:00.000Z");
});

test("only verified exact annual payment activates and is idempotent", () => {
  const payment = { signatureVerified: true, status: "SUCCESS", idempotencyKey: "evt-1", planCode: "STARTER", amountPaise: 149900, currency: "INR" };
  const active = activateVerifiedAnnualPayment({ subscription: null, payment, now: new Date("2025-01-31T00:00:00Z") });
  assert.equal(active.state, "ACTIVE");
  assert.equal(active.paidEntitlementEndsAt, "2026-01-31T00:00:00.000Z");
  assert.equal(activateVerifiedAnnualPayment({ subscription: active, payment }), active);
  assert.throws(() => activateVerifiedAnnualPayment({ subscription: null, payment: { ...payment, signatureVerified: false } }), /UNVERIFIED_PAYMENT/);
  assert.throws(() => activateVerifiedAnnualPayment({ subscription: null, payment: { ...payment, amountPaise: 1 } }), /PAYMENT_AMOUNT_MISMATCH/);
});

test("referrals reward exactly two months each with no milestone bonus", () => {
  assert.equal(rewardMonthsForVerifiedReferrals(1), 2);
  assert.equal(rewardMonthsForVerifiedReferrals(6), 12);
  assert.equal(rewardMonthsForVerifiedReferrals(7), 14);
});

test("qualifying referral requires first verified annual payment and blocks self referral", () => {
  const referral = { state: "PENDING", referrerUserId: "a", referredUserId: "b" };
  const result = qualifyReferral({ referral, payment: { signatureVerified: true, status: "SUCCESS", billingPeriod: "ANNUAL", isFirstSuccessfulPayment: true }, referrerSubscription: { entitlementEndsAt: "2026-01-01" } });
  assert.deepEqual([result.state, result.rewardMonths], ["REWARDED", 2]);
  assert.throws(() => qualifyReferral({ referral: { ...referral, referredUserId: "a" }, payment: {}, referrerSubscription: {} }), /SELF_REFERRAL_BLOCKED/);
});

test("referral extension uses current expiry and month-end policy", () => {
  assert.equal(extendReferralEntitlement("2025-01-31T00:00:00Z", new Date("2025-01-01T00:00:00Z")).toISOString(), "2025-03-31T00:00:00.000Z");
});

test("referral and WhatsApp links are safely encoded", () => {
  const link = buildReferralLink("https://app.example", " vardhan-ab12 ");
  assert.equal(link, "https://app.example/register?ref=VARDHAN-AB12");
  assert.match(buildWhatsAppReferralLink(link), /^https:\/\/wa\.me\/\?text=/);
});

test("campaign eligibility and analytics use only real supplied events", () => {
  const campaigns = [{ id: "1", status: "ACTIVE", placements: ["DASHBOARD"], audiences: ["ALL"], starts_at: "2025-01-01", ends_at: "2025-12-31" }, { id: "2", status: "DRAFT", placements: ["DASHBOARD"], audiences: ["ALL"] }];
  assert.deepEqual(selectEligibleCampaigns(campaigns, { placement: "DASHBOARD", now: new Date("2025-06-01") }).map((item) => item.id), ["1"]);
  assert.deepEqual(aggregateCampaignEvents([{ event_type: "IMPRESSION" }, { event_type: "CLICK" }, { event_type: "CLICK" }]), { impression: 1, click: 2 });
  assert.deepEqual(aggregateCampaignEvents(), {});
});

test("database plan-limit errors are actionable", () => {
  assert.match(toChitPlanError("postgres PLAN_ACTIVE_CHIT_LIMIT_REACHED"), /upgrade your plan/i);
});
