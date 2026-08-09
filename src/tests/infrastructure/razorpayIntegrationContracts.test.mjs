import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { VARDHAN_ANNUAL_PLANS } from "../../domain/subscriptions/VardhanPlanCatalog.js";

const backend = await readFile(new URL("../../../backend/razorpay_payments.py", import.meta.url), "utf8");
const migration = await readFile(new URL("../../../supabase/migrations/013_razorpay_payment_integration.sql", import.meta.url), "utf8");
const service = await readFile(new URL("../../services/growthPlatformService.js", import.meta.url), "utf8");
const ui = await readFile(new URL("../../pages/products/UpgradeSubscription.jsx", import.meta.url), "utf8");

test("server-authoritative plans retain exact paise prices", () => {
  assert.deepEqual(VARDHAN_ANNUAL_PLANS.map((plan) => plan.pricePaise), [149900, 299900, 499900]);
});

test("create-order accepts plan code and idempotency key but no client amount or currency", () => {
  assert.match(backend, /class CreateOrderRequest[\s\S]*plan_code[\s\S]*idempotency_key/);
  const requestModel = backend.match(/class CreateOrderRequest[\s\S]*?class VerifyCheckoutRequest/)?.[0] || "";
  assert.doesNotMatch(requestModel, /amount|currency/);
  assert.match(backend, /from public\.subscription_plans/);
});

test("order creation requires authenticated workspace membership and owner or admin role", () => {
  assert.match(backend, /Depends\(workspace_dependency\)/);
  assert.match(backend, /PURCHASE_ROLES = frozenset\(\{"owner", "admin"\}\)/);
});

test("Razorpay order response is checked against server snapshots", () => {
  assert.match(backend, /order\.get\("amount"\) != plan\["price_paise"\]/);
  assert.match(backend, /order\.get\("currency"\) != "INR"/);
  assert.match(backend, /order\.get\("receipt"\) != receipt/);
});

test("checkout verification uses stored order and constant-time HMAC", () => {
  assert.match(backend, /row\["provider_order_id"\] != payload\.razorpay_order_id/);
  assert.match(backend, /hmac\.compare_digest/);
  assert.match(backend, /f"\{order_id\}\|\{payment_id\}"/);
});

test("webhook verifies raw body before JSON parsing", () => {
  assert.ok(backend.indexOf("raw_body = await request.body()") < backend.indexOf("json.loads(raw_body)"));
  assert.ok(backend.indexOf("verify_webhook_signature(raw_body") < backend.indexOf("json.loads(raw_body)"));
});

test("webhook replay uses Razorpay event id and immutable provider events", () => {
  assert.match(backend, /X-Razorpay-Event-Id/);
  assert.match(backend, /provider_webhook_events where provider='razorpay' and event_id=\$1/);
  assert.match(backend, /"duplicate": True/);
});

test("captured payment alone enters existing service-only activation RPC", () => {
  assert.match(backend, /event_type in \{"payment\.captured", "order\.paid"\}/);
  assert.match(backend, /process_verified_annual_payment/);
  assert.match(backend, /state='SUBSCRIPTION_ACTIVATED'/);
});

test("failed, refund, and dispute events have non-success boundaries", () => {
  assert.match(backend, /payment\.failed/);
  assert.match(backend, /refund\.processed/);
  assert.match(backend, /payment\.dispute\.created/);
  assert.match(backend, /process_verified_payment_reversal/);
});

test("attempt state machine rejects backward transitions", () => {
  assert.match(migration, /INVALID_PAYMENT_STATE_TRANSITION/);
  assert.match(migration, /SUBSCRIPTION_ACTIVATED[\s\S]*REFUNDED[\s\S]*REVERSED/);
});

test("provider identities and customer idempotency are unique", () => {
  assert.match(migration, /payment_checkout_attempts_idempotency_unique/);
  assert.match(migration, /payment_checkout_attempts_order_unique/);
  assert.match(migration, /payment_checkout_attempts_payment_unique/);
});

test("checkout never marks the subscription active from the browser callback", () => {
  assert.match(ui, /Payment received\. Verifying securely through Razorpay/);
  assert.match(ui, /waitForPaymentActivation/);
  assert.doesNotMatch(service, /from\("billing_subscriptions"\)\.update/);
});

test("client contract contains no Razorpay secret or webhook secret", () => {
  assert.doesNotMatch(service, /RAZORPAY_KEY_SECRET|RAZORPAY_WEBHOOK_SECRET|service.?role/i);
  assert.match(service, /key: order\.keyId/);
});

test("checkout handles cancellation, failure, retries, and duplicate submission", () => {
  assert.match(service, /CHECKOUT_CANCELLED/);
  assert.match(service, /PAYMENT_FAILED/);
  assert.match(service, /retry: \{ enabled: true \}/);
  assert.match(ui, /submitting\.current/);
});

test("customer billing uses persisted values and exposes no fake receipt link", () => {
  assert.match(ui, /paid_entitlement_ends_at/);
  assert.match(ui, /entitlement_ends_at/);
  assert.match(ui, /provider_payment_id \|\| attempt\.provider_order_id/);
  assert.doesNotMatch(ui, /invoiceUrl|receiptUrl/);
});
