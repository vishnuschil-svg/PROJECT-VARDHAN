import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateRazorpayEnvironment } from "../../../scripts/razorpay-env-contract.mjs";

const root = new URL("../../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("canonical webhook remains the only active Razorpay webhook pipeline", async () => {
  const [canonical, legacy] = await Promise.all([read("backend/razorpay_payments.py"), read("backend/enterprise_api.py")]);
  assert.match(canonical, /prefix="\/api\/payments\/razorpay"/);
  assert.match(canonical, /@router\.post\("\/webhook"\)/);
  assert.match(canonical, /verify_webhook_signature\(raw_body/);
  assert.match(legacy, /@router\.post\("\/webhooks\/razorpay", deprecated=True\)[\s\S]*HTTP_410_GONE/);
  assert.match(legacy, /@router\.post\("\/billing\/subscriptions", deprecated=True\)[\s\S]*HTTP_410_GONE/);
  assert.doesNotMatch(legacy, /await razorpay\.create_subscription/);
});

test("webhook replay and payment identities cannot duplicate activation", async () => {
  const [backend, paymentMigration, infrastructureMigration] = await Promise.all([
    read("backend/razorpay_payments.py"),
    read("supabase/migrations/013_razorpay_payment_integration.sql"),
    read("supabase/migrations/005_enterprise_production_infrastructure.sql"),
  ]);
  assert.match(backend, /WEBHOOK_REPLAY_IGNORED/);
  assert.match(backend, /attempt\["state"\] != "SUBSCRIPTION_ACTIVATED"/);
  assert.match(paymentMigration, /payment_checkout_attempts_payment_unique/);
  assert.match(infrastructureMigration, /provider_webhook_events_unique unique \(provider,event_id\)/);
});

test("Vercel schedules the protected existing reconciler once daily", async () => {
  const [vercel, backend] = await Promise.all([read("vercel.json"), read("backend/razorpay_payments.py")]);
  const config = JSON.parse(vercel);
  assert.deepEqual(config.crons, [{ path: "/api/payments/razorpay/reconcile-pending", schedule: "0 2 * * *" }]);
  assert.match(backend, /hmac\.compare_digest\(authorization, f"Bearer \{cron_secret\}"\)/);
  assert.match(backend, /for update skip locked/);
  assert.match(backend, /limit 1 for update skip locked/);
});

test("verified payment creates one durable SaaS receipt on webhook or reconciliation", async () => {
  const [backend, migration] = await Promise.all([read("backend/razorpay_payments.py"), read("supabase/migrations/016_saas_billing_receipts.sql")]);
  assert.equal((backend.match(/await ensure_saas_billing_receipt/g) || []).length, 3);
  assert.match(backend, /on conflict\(subscription_payment_id\) do nothing/);
  assert.match(migration, /unique \(subscription_payment_id\)/i);
  assert.match(migration, /references public\.subscription_payments\(id\)/i);
  assert.doesNotMatch(migration, /chit_collections|chit_receipts|member_id|group_id/i);
});

test("SaaS billing history exposes the persisted receipt without using group receipts", async () => {
  const [service, page] = await Promise.all([read("src/services/growthPlatformService.js"), read("src/pages/products/UpgradeSubscription.jsx")]);
  assert.match(service, /from\("saas_billing_receipts"\)/);
  assert.match(page, /View Receipt/);
  assert.match(page, /Software subscription payment|selectedReceipt\.description/);
  assert.doesNotMatch(service, /chit_receipts|ReceiptRepository/);
});

test("production environment validation fails closed for mode and key mismatch", () => {
  const base = { RAZORPAY_KEY_SECRET: "server-secret", RAZORPAY_WEBHOOK_SECRET: "webhook-secret", CRON_SECRET: "cron-secret" };
  assert.equal(validateRazorpayEnvironment({ ...base, RAZORPAY_MODE: "test", RAZORPAY_KEY_ID: "rzp_test_example" }, { requireValues: true, production: true }).ok, false);
  assert.equal(validateRazorpayEnvironment({ ...base, RAZORPAY_MODE: "live", RAZORPAY_KEY_ID: "rzp_test_example" }, { requireValues: true, production: true }).ok, false);
  assert.equal(validateRazorpayEnvironment({ ...base, RAZORPAY_MODE: "live", RAZORPAY_KEY_ID: "rzp_live_example" }, { requireValues: true, production: true }).ok, true);
});

test("Razorpay secrets cannot be exposed through frontend variables", () => {
  const result = validateRazorpayEnvironment({
    RAZORPAY_MODE: "test", RAZORPAY_KEY_ID: "rzp_test_example", RAZORPAY_KEY_SECRET: "server",
    RAZORPAY_WEBHOOK_SECRET: "webhook", CRON_SECRET: "cron", VITE_RAZORPAY_KEY_SECRET: "forbidden",
  }, { requireValues: true });
  assert.equal(result.ok, false);
  assert.match(result.failures.join(" "), /must not expose/);
});

test("SaaS order creation rejects group and member financial input by contract", async () => {
  const backend = await read("backend/razorpay_payments.py");
  const request = backend.match(/class CreateOrderRequest[\s\S]*?class VerifyCheckoutRequest/)?.[0] || "";
  assert.match(request, /extra="forbid"|StrictModel/);
  for (const forbidden of ["amount", "group", "member", "bid", "distribution", "payout", "collection"]) assert.doesNotMatch(request, new RegExp(forbidden, "i"));
  assert.match(backend, /from public\.subscription_plans where product_id='chit_management'/);
});
