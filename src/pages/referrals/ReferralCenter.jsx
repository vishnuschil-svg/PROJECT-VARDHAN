import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { buildReferralLink, buildWhatsAppReferralLink, rewardMonthsForVerifiedReferrals } from "../../domain/referrals/ReferralDomain";
import { loadReferralCenter } from "../../services/growthPlatformService";
import "../products/UpgradeSubscription.css";

export default function ReferralCenter() {
  const [data, setData] = useState({ code: "", referrals: [], subscription: null });
  const [message, setMessage] = useState("Loading your verified referrals…");
  useEffect(() => { loadReferralCenter().then((value) => { setData(value); setMessage(""); }).catch((error) => setMessage(error.message)); }, []);
  const link = useMemo(() => data.code && buildReferralLink(window.location.origin, data.code), [data.code]);
  const rewarded = data.referrals.filter((item) => item.status === "REWARDED").length;
  const pending = data.referrals.filter((item) => ["PENDING", "QUALIFIED"].includes(item.status)).length;
  const milestoneText = rewarded >= 6 ? "12-month milestone completed." : `Refer ${6 - rewarded} more to complete 12 months free.`;
  async function copy() { await navigator.clipboard.writeText(link); setMessage("Referral link copied."); }
  async function copyCode() { await navigator.clipboard.writeText(data.code); setMessage("Referral code copied."); }
  return <DashboardLayout><div className="dashboard-page"><section className="upgrade-subscription">
    <div className="upgrade-hero"><span>REFER & EARN</span><h1>Refer 1 Paid Customer. Get 2 Months FREE.</h1><p>A reward is granted exactly once after your referral's first signature-verified successful annual payment. Refer 6. Get Your Next 12 Months FREE—six times two months, with no extra milestone bonus.</p></div>
    <div className="upgrade-plan-grid"><article className="upgrade-plan-card"><span>Your code</span><strong>{data.code || "—"}</strong><p>{link || "Your secure referral link appears after the profile is available."}</p><button disabled={!data.code} onClick={copyCode}>Copy code</button><button disabled={!link} onClick={copy}>Copy link</button>{link && <a href={buildWhatsAppReferralLink(link)} target="_blank" rel="noreferrer">Share on WhatsApp</a>}</article><article className="upgrade-plan-card"><span>Verified rewards</span><strong>{rewardMonthsForVerifiedReferrals(rewarded)} months FREE</strong><p>{rewarded} successful · {pending} pending. {milestoneText}</p></article><article className="upgrade-plan-card"><span>{data.subscription?.plan_name_snapshot || "Current subscription"}</span><strong>{data.subscription?.entitlement_ends_at ? new Date(data.subscription.entitlement_ends_at).toLocaleDateString("en-IN") : "—"}</strong><p>Paid expiry: {data.subscription?.paid_entitlement_ends_at ? new Date(data.subscription.paid_entitlement_ends_at).toLocaleDateString("en-IN") : "—"}<br />Expiry after earned rewards is shown above.</p></article></div>
    {message && <p role="status">{message}</p>}
    <div className="upgrade-hero"><h2>Referral history</h2>{data.referrals.length === 0 ? <p>No referrals yet. Analytics remain empty until real events occur.</p> : <ul>{data.referrals.map((item) => <li key={item.id}>{item.status} · {item.reward_months} months · {new Date(item.attributed_at).toLocaleDateString("en-IN")}</li>)}</ul>}</div>
  </section></div></DashboardLayout>;
}
