import { isSupabaseConfigured, supabaseClient } from "../lib/supabase/SupabaseClient.js";

export const PAYMENT_PROVIDER_NOT_CONFIGURED = "PAYMENT_PROVIDER_NOT_CONFIGURED";

export function getPaymentReadiness(env = import.meta.env) {
  const configured = Boolean(isSupabaseConfigured && (env?.VITE_PLATFORM_API_URL || "/api"));
  return configured
    ? { configured: true, provider: "razorpay" }
    : { configured: false, code: PAYMENT_PROVIDER_NOT_CONFIGURED, message: "Online payment is not configured. Contact support to activate an annual plan." };
}

async function paymentRequest(path, { method = "GET", workspaceId, body } = {}, env = import.meta.env) {
  const readiness = getPaymentReadiness(env);
  if (!readiness.configured) return { ok: false, ...readiness };
  const { data } = await requireSupabase().auth.getSession();
  if (!data.session?.access_token) return { ok: false, code: "AUTHENTICATION_REQUIRED", message: "Sign in again before starting payment." };
  const base = String(env?.VITE_PLATFORM_API_URL || "/api").replace(/\/$/, "");
  const response = await fetch(`${base}/payments/razorpay${path}`, {
    method,
    headers: { Authorization: `Bearer ${data.session.access_token}`, "X-Workspace-Id": workspaceId, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, code: result.detail || "PAYMENT_REQUEST_FAILED", message: result.detail || "The secure payment request could not be completed." };
  return { ok: true, ...result };
}

export async function createAnnualCheckout(planCode, workspaceId, idempotencyKey = crypto.randomUUID(), env = import.meta.env) {
  const readiness = getPaymentReadiness(env);
  if (!readiness.configured) return { ok: false, ...readiness };
  if (!workspaceId) return { ok: false, code: "WORKSPACE_REQUIRED", message: "Choose a valid workspace before starting payment." };
  return paymentRequest("/create-order", { method: "POST", workspaceId, body: { planCode, idempotencyKey } }, env);
}

export function loadRazorpayCheckout(documentObject = document) {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = documentObject.querySelector('script[data-vardhan-razorpay="checkout"]');
    if (existing) { existing.addEventListener("load", resolve, { once: true }); existing.addEventListener("error", () => reject(new Error("Razorpay Checkout could not be loaded.")), { once: true }); return; }
    const script = documentObject.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.vardhanRazorpay = "checkout";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Razorpay Checkout could not be loaded."));
    documentObject.head.appendChild(script);
  });
}

export async function openAnnualCheckout({ planCode, workspaceId, onStatus }) {
  onStatus?.("CREATING_ORDER");
  const order = await createAnnualCheckout(planCode, workspaceId);
  if (!order.ok) return order;
  if (order.reused) return { ok: false, code: "PAYMENT_PENDING_CONFIRMATION", attemptId: order.attemptId, state: order.state, message: "Payment verification is already pending. Do not make another payment yet." };
  await loadRazorpayCheckout();
  onStatus?.("CUSTOMER_ACTION_PENDING");
  return new Promise((resolve) => {
    let submitted = false;
    const checkout = new window.Razorpay({
      key: order.keyId, amount: order.amount, currency: order.currency, order_id: order.orderId,
      name: order.merchantName, description: `${order.planName} annual subscription`,
      handler: async (response) => {
        if (submitted) return;
        submitted = true;
        onStatus?.("PAYMENT_REPORTED");
        const verified = await paymentRequest("/verify-checkout", { method: "POST", workspaceId, body: { attemptId: order.attemptId, razorpayOrderId: response.razorpay_order_id, razorpayPaymentId: response.razorpay_payment_id, razorpaySignature: response.razorpay_signature } });
        resolve(verified.ok ? { ...verified, attemptId: order.attemptId } : verified);
      },
      modal: { ondismiss: () => { if (!submitted) resolve({ ok: false, code: "CHECKOUT_CANCELLED", attemptId: order.attemptId, message: "Checkout closed. If you attempted payment, do not pay again yet—check its status first." }); } },
      retry: { enabled: true }, theme: { color: "#7c3aed" },
    });
    checkout.on("payment.failed", (response) => { if (!submitted) resolve({ ok: false, code: "PAYMENT_FAILED", message: response?.error?.description || "Payment failed. You can safely retry." }); });
    checkout.open();
  });
}

export async function getPaymentAttempt(attemptId, workspaceId) {
  return paymentRequest(`/attempts/${encodeURIComponent(attemptId)}`, { workspaceId });
}

export async function waitForPaymentActivation(attemptId, workspaceId, { attempts = 9, delays = [0, 2000, 2000, 3000, 3000, 5000, 8000, 13000, 21000] } = {}) {
  for (let index = 0; index < attempts; index += 1) {
    const delay = delays[Math.min(index, delays.length - 1)] || 0;
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    const result = await getPaymentAttempt(attemptId, workspaceId);
    if (!result.ok || ["SUBSCRIPTION_ACTIVATED", "FAILED", "REFUNDED", "REVERSED", "EXPIRED"].includes(result.state)) return result;
  }
  return { ok: true, state: "PENDING_CONFIRMATION", attemptId, message: "Verification is taking longer than usual. You can safely close this page; server-side recovery will continue. Do not pay again yet." };
}

export async function recheckPaymentAttempt(attemptId) {
  return paymentRequest(`/admin/recheck/${encodeURIComponent(attemptId)}`, { method: "POST", workspaceId: "" });
}

export async function loadCustomerBilling() {
  const client = requireSupabase();
  const [attempts, subscriptions, receipts] = await Promise.all([
    client.from("payment_checkout_attempts").select("id,plan_code,plan_name_snapshot,amount_paise,currency,provider_order_id,provider_payment_id,state,created_at,activated_at" ).order("created_at", { ascending: false }).limit(20),
    client.from("billing_subscriptions").select("id,plan_code,plan_name_snapshot,price_paise_snapshot,status,paid_entitlement_ends_at,entitlement_ends_at,max_active_chits_snapshot,created_at").eq("product_id", "chit_management").order("created_at", { ascending: false }).limit(1),
    client.from("saas_billing_receipts").select("id,subscription_payment_id,receipt_number,issuer_name,customer_name,plan_code,plan_name,billing_period,valid_from,valid_until,amount_paise,currency,payment_date,provider_payment_id,provider_order_id,provider_receipt,payment_status,description,tax_details").order("payment_date", { ascending: false }).limit(20),
  ]);
  if (attempts.error || subscriptions.error || receipts.error) throw new Error("Billing history could not be loaded.");
  const subscription = subscriptions.data?.[0] || null;
  const rewards = subscription ? await client.from("referral_rewards").select("months,status").eq("subscription_id", subscription.id).eq("status", "GRANTED") : { data: [], error: null };
  if (rewards.error) throw new Error("Billing history could not be loaded.");
  return { attempts: attempts.data || [], receipts: receipts.data || [], subscription, rewardMonths: (rewards.data || []).reduce((total, reward) => total + Number(reward.months || 0), 0) };
}

function requireSupabase() {
  if (!isSupabaseConfigured || !supabaseClient) throw new Error("Supabase is not configured.");
  return supabaseClient;
}

export async function loadReferralCenter() {
  const client = requireSupabase();
  await client.rpc("ensure_customer_referral_code");
  const [{ data: profile, error: profileError }, { data: referrals, error: referralError }, { data: subscriptions, error: subscriptionError }] = await Promise.all([
    client.from("user_profiles").select("referral_code").single(),
    client.from("referrals").select("id,status,reward_months,attributed_at,qualified_at,rewarded_at,rejected_reason").order("attributed_at", { ascending: false }),
    client.from("billing_subscriptions").select("plan_name_snapshot,paid_entitlement_ends_at,entitlement_ends_at,status").eq("product_id", "chit_management").order("entitlement_ends_at", { ascending: false }).limit(1),
  ]);
  if (profileError || referralError || subscriptionError) throw new Error("Referral information could not be loaded.");
  return { code: profile?.referral_code || "", referrals: referrals || [], subscription: subscriptions?.[0] || null };
}

export async function loadAdminGrowthData() {
  const client = requireSupabase();
  const [subscriptions, payments, attempts, reconciliationEvents, referrals, rewards, campaigns, events] = await Promise.all([
    client.from("billing_subscriptions").select("id,workspace_id,plan_code,plan_name_snapshot,price_paise_snapshot,status,paid_entitlement_ends_at,entitlement_ends_at,active_chit_count,created_at"),
    client.from("subscription_payments").select("id,workspace_id,provider,status,amount_paise,currency,verified_at,created_at"),
    client.from("payment_checkout_attempts").select("id,workspace_id,user_id,plan_code,amount_paise,currency,provider_order_id,provider_payment_id,state,callback_verified_at,webhook_event_id,last_provider_check_at,reconcile_attempt_count,provider_last_status,last_error_code,created_at,activated_at"),
    client.from("payment_reconciliation_events").select("id,attempt_id,event_type,provider_status,error_code,actor_type,actor_user_id,created_at").order("created_at", { ascending: false }).limit(200),
    client.from("referrals").select("id,referrer_user_id,referred_user_id,status,reward_months,attributed_at,qualified_at,rewarded_at,rejected_reason"),
    client.from("referral_rewards").select("id,referral_id,months,status,previous_expiry,new_expiry,created_at"),
    client.from("marketing_campaigns").select("id,name,campaign_type,title,short_message,cta_label,cta_target,priority,status,placements,audiences,starts_at,ends_at,created_at"),
    client.from("marketing_events").select("campaign_id,event_type,created_at"),
  ]);
  const failed = [subscriptions, payments, attempts, reconciliationEvents, referrals, rewards, campaigns, events].find((result) => result.error);
  if (failed) throw new Error("Growth administration data could not be loaded.");
  return { subscriptions: subscriptions.data || [], payments: payments.data || [], attempts: attempts.data || [], reconciliationEvents: reconciliationEvents.data || [], referrals: referrals.data || [], rewards: rewards.data || [], campaigns: campaigns.data || [], events: events.data || [] };
}

export async function createMarketingCampaign(input) {
  const client = requireSupabase();
  const { data: authData } = await client.auth.getUser();
  if (!authData.user) throw new Error("Authentication is required.");
  const name = String(input.name || "").trim();
  if (!name) throw new Error("Campaign name is required.");
  if (input.startsAt && input.endsAt && new Date(input.endsAt) < new Date(input.startsAt)) throw new Error("Campaign end must be after its start.");
  const { data, error } = await client.from("marketing_campaigns").insert({ name, campaign_type: input.campaignType || "ANNOUNCEMENT", title: input.title || name, short_message: input.shortMessage || null, cta_label: input.ctaLabel || null, cta_target: input.ctaTarget || null, priority: Number(input.priority) || 0, status: input.status || "DRAFT", placements: input.placements || [], audiences: input.audiences || ["ALL"], starts_at: input.startsAt || null, ends_at: input.endsAt || null, creative: input.creative || {}, created_by: authData.user.id }).select().single();
  if (error) throw new Error("Campaign could not be saved.");
  return data;
}

export async function updateMarketingCampaign(id, input) {
  const client = requireSupabase();
  const patch = {
    name: String(input.name || "").trim(), campaign_type: input.campaignType || "ANNOUNCEMENT",
    title: input.title || null, short_message: input.shortMessage || null, cta_label: input.ctaLabel || null,
    cta_target: input.ctaTarget || null, priority: Number(input.priority) || 0, status: input.status,
    placements: input.placements || [], audiences: input.audiences || ["ALL"],
    starts_at: input.startsAt || null, ends_at: input.endsAt || null, updated_at: new Date().toISOString(),
  };
  if (!patch.name) throw new Error("Campaign name is required.");
  const { data, error } = await client.from("marketing_campaigns").update(patch).eq("id", id).select().single();
  if (error) throw new Error("Campaign could not be updated.");
  return data;
}

export async function rejectReferral(referralId, reason) {
  const { error } = await requireSupabase().rpc("admin_reject_referral", { p_referral_id: referralId, p_reason: reason });
  if (error) throw new Error("Referral correction could not be recorded.");
}

export async function reverseReferralReward(rewardId, reason) {
  const { error } = await requireSupabase().rpc("admin_reverse_referral_reward", { p_reward_id: rewardId, p_reason: reason });
  if (error) throw new Error("Referral reward reversal could not be recorded.");
}
