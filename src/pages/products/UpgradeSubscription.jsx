import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { PRODUCT_CATALOG, getProductById } from "../../config/productLicensing";
import { VARDHAN_ANNUAL_PLANS, formatAnnualPrice } from "../../domain/subscriptions/VardhanPlanCatalog";
import { getPaymentAttempt, getPaymentReadiness, loadCustomerBilling, openAnnualCheckout, waitForPaymentActivation } from "../../services/growthPlatformService";
import { useAuth } from "../../hooks/useAuth";
import "./UpgradeSubscription.css";

function dateLabel(value) { return value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"; }
const UNRESOLVED_PAYMENT_STATES = new Set(["ORDER_CREATED", "CUSTOMER_ACTION_PENDING", "PAYMENT_REPORTED", "VERIFIED", "VERIFYING", "PENDING_CONFIRMATION", "CAPTURED"]);

function UpgradeSubscription() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const { activeWorkspace } = useAuth();
  const product = useMemo(() => getProductById(productId || searchParams.get("productId")) || PRODUCT_CATALOG[0], [productId, searchParams]);
  const readiness = getPaymentReadiness();
  const workspaceId = activeWorkspace?.id || activeWorkspace?.workspace_id || null;
  const submitting = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentState, setPaymentState] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [billing, setBilling] = useState({ attempts: [], receipts: [], subscription: null, rewardMonths: 0 });
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  async function refreshBilling() {
    try { setBilling(await loadCustomerBilling()); } catch (error) { setMessage(error.message); }
  }
  useEffect(() => { refreshBilling(); }, []);
  useEffect(() => {
    if (!["VERIFYING", "PENDING_CONFIRMATION"].includes(paymentState)) return undefined;
    setElapsedSeconds(0);
    const timer = window.setInterval(() => setElapsedSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [paymentState]);

  const unresolvedAttempt = billing.attempts.find((attempt) => UNRESOLVED_PAYMENT_STATES.has(attempt.state));

  async function checkPaymentStatus(attemptId = unresolvedAttempt?.id) {
    if (!attemptId || !workspaceId) return;
    setPaymentState("VERIFYING"); setMessage("Checking the provider-confirmed payment status…");
    const result = await getPaymentAttempt(attemptId, workspaceId);
    if (!result.ok) { setPaymentState("PENDING_CONFIRMATION"); setMessage("Status is temporarily unavailable. Do not make another payment yet; server-side recovery will continue."); return; }
    setPaymentState(result.state);
    setMessage(result.state === "SUBSCRIPTION_ACTIVATED" ? "Annual subscription activated securely." : result.message || (UNRESOLVED_PAYMENT_STATES.has(result.state) ? "Payment verification is pending. Do not make another payment yet." : `Payment status: ${result.state}`));
    await refreshBilling();
  }

  async function requestPlan(code) {
    if (submitting.current) return;
    submitting.current = true; setIsSubmitting(true); setMessage("");
    try {
      const result = await openAnnualCheckout({ planCode: code, workspaceId, onStatus: setPaymentState });
      if (!result.ok) {
        setPaymentState(result.code); setMessage(result.message);
        if (result.code === "PAYMENT_PENDING_CONFIRMATION" && result.attemptId) await checkPaymentStatus(result.attemptId);
        else await refreshBilling();
        return;
      }
      setPaymentState("VERIFYING"); setMessage("Payment received. Verifying securely through Razorpay…");
      const final = await waitForPaymentActivation(result.attemptId, workspaceId);
      setPaymentState(final.state);
      setMessage(final.state === "SUBSCRIPTION_ACTIVATED" ? "Annual subscription activated securely." : final.message || `Payment status: ${final.state}`);
      await refreshBilling();
    } catch (error) { setPaymentState("PENDING_CONFIRMATION"); setMessage(`${error.message || "Payment status could not be checked."} If you attempted payment, do not pay again; use Check Payment Status.`); }
    finally { submitting.current = false; setIsSubmitting(false); }
  }

  const subscription = billing.subscription;
  const referralMonths = billing.rewardMonths;

  return <DashboardLayout><div className="dashboard-page"><section className="upgrade-subscription">
    <div className="upgrade-hero"><Badge label="Annual subscription" variant="warning" size="medium" /><h1>Unlock {product.productName}</h1><p>Choose the immutable annual plan that fits your active chit capacity. The server determines every price; monthly billing is not offered.</p><div className="upgrade-actions"><Button variant="ghost" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button></div></div>
    <div className="upgrade-plan-grid">{VARDHAN_ANNUAL_PLANS.map((plan) => <article key={plan.code} className="upgrade-plan-card"><span>{plan.name} · Annual only</span><strong>{formatAnnualPrice(plan.pricePaise)} / year</strong><p>{plan.maxActiveChits === null ? "Unlimited active chits" : `Up to ${plan.maxActiveChits} active chit${plan.maxActiveChits === 1 ? "" : "s"}`}. Completed and archived chits do not count.</p><Button disabled={isSubmitting || !workspaceId || Boolean(unresolvedAttempt)} variant={plan.code === "GROWTH" ? "primary" : "default"} fullWidth onClick={() => requestPlan(plan.code)}>Choose {plan.name}</Button></article>)}</div>
    {!readiness.configured && <p role="status">{readiness.message}</p>}{message && <p role="status">{message}</p>}{paymentState && <p>Secure payment state: {paymentState}{["VERIFYING", "PENDING_CONFIRMATION"].includes(paymentState) ? ` · ${elapsedSeconds}s elapsed` : ""}</p>}
    {unresolvedAttempt && <div className="upgrade-hero"><h2>Payment verification pending</h2><p>Do not make another payment yet. It is safe to close this page; provider-backed recovery continues on the server.</p><div className="upgrade-actions"><Button disabled={isSubmitting} onClick={() => checkPaymentStatus()}>Check Payment Status</Button><Button variant="ghost" onClick={() => navigate("/dashboard")}>Return to Dashboard</Button></div></div>}
    {subscription && <div className="upgrade-hero"><h2>Current annual subscription</h2><p><strong>{subscription.plan_name_snapshot}</strong> · {formatAnnualPrice(subscription.price_paise_snapshot)} / year</p><p>Payment status: {subscription.status}<br />Paid expiry: {dateLabel(subscription.paid_entitlement_ends_at)}<br />Referral extension: +{referralMonths} calendar month{referralMonths === 1 ? "" : "s"}<br />Access until: {dateLabel(subscription.entitlement_ends_at)}<br />Active chit limit: {subscription.max_active_chits_snapshot ?? "Unlimited"}</p></div>}
    <div className="upgrade-hero"><h2>Payment history</h2>{billing.attempts.length === 0 ? <p>No payment attempts recorded.</p> : <div style={{ overflowX: "auto" }}><table><thead><tr><th>Date</th><th>Plan</th><th>Amount</th><th>Status</th><th>Payment reference</th><th>Receipt</th></tr></thead><tbody>{billing.attempts.map((attempt) => { const receipt = billing.receipts.find((item) => item.provider_payment_id === attempt.provider_payment_id); return <tr key={attempt.id}><td>{dateLabel(attempt.created_at)}</td><td>{attempt.plan_name_snapshot}</td><td>{formatAnnualPrice(attempt.amount_paise)}</td><td>{attempt.state}</td><td>{attempt.provider_payment_id || attempt.provider_order_id || "—"}</td><td>{receipt ? <button type="button" onClick={() => setSelectedReceipt(receipt)}>View Receipt</button> : "—"}</td></tr>; })}</tbody></table></div>}</div>
    {selectedReceipt && <div className="upgrade-hero" role="region" aria-label="SaaS billing receipt"><div className="upgrade-actions"><h2>{selectedReceipt.issuer_name}</h2><Button variant="ghost" onClick={() => setSelectedReceipt(null)}>Close</Button></div><p><strong>{selectedReceipt.receipt_number}</strong><br />{selectedReceipt.description}</p><p>Customer: {selectedReceipt.customer_name}<br />Plan: {selectedReceipt.plan_name} ({selectedReceipt.billing_period})<br />Validity: {dateLabel(selectedReceipt.valid_from)} to {dateLabel(selectedReceipt.valid_until)}<br />Amount paid: {formatAnnualPrice(selectedReceipt.amount_paise)} {selectedReceipt.currency}<br />Payment date: {dateLabel(selectedReceipt.payment_date)}<br />Payment status: {selectedReceipt.payment_status}<br />Razorpay payment ID: {selectedReceipt.provider_payment_id}<br />Razorpay order ID: {selectedReceipt.provider_order_id}<br />Provider receipt: {selectedReceipt.provider_receipt}</p></div>}
  </section></div></DashboardLayout>;
}

export default UpgradeSubscription;
