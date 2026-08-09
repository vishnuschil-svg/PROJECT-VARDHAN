import { useEffect, useState } from "react";
import AdminLayout from "../../components/platform-admin/AdminLayout";
import { VARDHAN_ANNUAL_PLANS, formatAnnualPrice } from "../../domain/subscriptions/VardhanPlanCatalog";
import { getPaymentReadiness, loadAdminGrowthData, recheckPaymentAttempt } from "../../services/growthPlatformService";
import "../products/UpgradeSubscription.css";

function SubscriptionManagement() {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState("Loading persisted subscriptions…");
  const readiness = getPaymentReadiness();
  const load = () => loadAdminGrowthData().then((value) => { setData(value); setMessage(""); }).catch((error) => setMessage(error.message));
  useEffect(() => { load(); }, []);
  async function recheck(id) {
    setMessage("Rechecking payment with Razorpay…");
    const result = await recheckPaymentAttempt(id);
    setMessage(result.ok ? `Provider-confirmed status: ${result.state}` : result.message);
    await load();
  }
  return <AdminLayout title="Annual Subscription Management" subtitle="Immutable purchased-plan snapshots and verified payment records">
    <div className="upgrade-plan-grid">{VARDHAN_ANNUAL_PLANS.map((plan) => <article className="upgrade-plan-card" key={plan.code}><span>{plan.name} · v{plan.version}</span><strong>{formatAnnualPrice(plan.pricePaise)} / year</strong><p>{plan.maxActiveChits === null ? "Unlimited active chits" : `${plan.maxActiveChits} active chit limit`}</p></article>)}</div>
    <p role="status">{readiness.configured ? `Payment provider ready: ${readiness.provider}` : readiness.message}</p>
    {message && <p role="status">{message}</p>}
    {!data?.subscriptions.length ? <p>No real annual subscriptions have been recorded.</p> : <div style={{ overflowX: "auto" }}><table><thead><tr><th>Workspace</th><th>Plan</th><th>Status</th><th>Paid through</th><th>Reward-adjusted through</th><th>Active chits</th></tr></thead><tbody>{data.subscriptions.map((row) => <tr key={row.id}><td>{row.workspace_id}</td><td>{row.plan_name_snapshot || row.plan_code}</td><td>{row.status}</td><td>{row.paid_entitlement_ends_at || "—"}</td><td>{row.entitlement_ends_at || "—"}</td><td>{row.active_chit_count}</td></tr>)}</tbody></table></div>}
    <p>{data?.payments.length || 0} verified payment record{data?.payments.length === 1 ? "" : "s"}. Subscription activation is backend/webhook-only.</p>
    <h2>Razorpay checkout attempts</h2>
    {!data?.attempts.length ? <p>No real Razorpay checkout attempts have been recorded.</p> : <div style={{ overflowX: "auto" }}><table><thead><tr><th>Purchase / workspace</th><th>Plan</th><th>Order / payment</th><th>State</th><th>Callback</th><th>Webhook</th><th>Last provider check</th><th>Checks</th><th>Last error</th><th>Referral</th><th>Activated</th><th>Action</th></tr></thead><tbody>{data.attempts.map((row) => <tr key={row.id}><td>{row.id}<br />{row.workspace_id}</td><td>{row.plan_code}<br />{formatAnnualPrice(row.amount_paise)}</td><td>{row.provider_order_id || "—"}<br />{row.provider_payment_id || "—"}</td><td>{row.state}<br />{row.provider_last_status || "—"}</td><td>{row.callback_verified_at || "No"}</td><td>{row.webhook_event_id ? "Received" : "No"}</td><td>{row.last_provider_check_at || "—"}</td><td>{row.reconcile_attempt_count || 0}</td><td>{row.last_error_code || "—"}</td><td>{data.referrals.find((referral) => referral.referred_user_id === row.user_id)?.status || "Not attributed"}</td><td>{row.activated_at || "—"}</td><td><button type="button" onClick={() => recheck(row.id)}>Recheck payment</button></td></tr>)}</tbody></table></div>}
    <h2>Payment reconciliation timeline</h2>
    {!data?.reconciliationEvents.length ? <p>No reconciliation events recorded.</p> : <div style={{ overflowX: "auto" }}><table><thead><tr><th>Time</th><th>Attempt</th><th>Event</th><th>Provider status</th><th>Actor</th><th>Error</th></tr></thead><tbody>{data.reconciliationEvents.map((row) => <tr key={row.id}><td>{row.created_at}</td><td>{row.attempt_id}</td><td>{row.event_type}</td><td>{row.provider_status || "—"}</td><td>{row.actor_type}</td><td>{row.error_code || "—"}</td></tr>)}</tbody></table></div>}
  </AdminLayout>;
}
export default SubscriptionManagement;
