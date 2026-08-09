import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/platform-admin/AdminLayout";
import { aggregateCampaignEvents } from "../../domain/marketing/MarketingCampaign";
import { createMarketingCampaign, loadAdminGrowthData, rejectReferral, reverseReferralReward, updateMarketingCampaign } from "../../services/growthPlatformService";
import "../products/UpgradeSubscription.css";

export default function GrowthManagement({ mode = "referrals" }) {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState("Loading real production records…");
  const [campaign, setCampaign] = useState({ id: null, name: "", campaignType: "ANNOUNCEMENT", title: "", shortMessage: "", ctaLabel: "", ctaTarget: "", priority: 0, status: "DRAFT", placement: "DASHBOARD", audience: "ALL", startsAt: "", endsAt: "" });
  const refresh = useCallback(() => loadAdminGrowthData().then((value) => { setData(value); setMessage(""); }).catch((error) => setMessage(error.message)), []);
  useEffect(() => { refresh(); }, [refresh]);
  const analytics = useMemo(() => aggregateCampaignEvents(data?.events || []), [data]);
  const rows = mode === "marketing" ? data?.campaigns : data?.referrals;

  async function saveCampaign(event) {
    event.preventDefault(); setMessage("Saving campaign…");
    try { const payload = { ...campaign, placements: [campaign.placement], audiences: [campaign.audience] }; if (campaign.id) await updateMarketingCampaign(campaign.id, payload); else await createMarketingCampaign(payload); setCampaign({ ...campaign, id: null, name: "", title: "", shortMessage: "", ctaLabel: "", ctaTarget: "" }); await refresh(); }
    catch (error) { setMessage(error.message); }
  }

  async function runReasonedAction(action, id) {
    const reason = window.prompt("Enter the required audit reason:");
    if (!reason?.trim()) return;
    try { await action(id, reason.trim()); await refresh(); } catch (error) { setMessage(error.message); }
  }

  function editCampaign(row) {
    setCampaign({ id: row.id, name: row.name, campaignType: row.campaign_type, title: row.title || "", shortMessage: row.short_message || "", ctaLabel: row.cta_label || "", ctaTarget: row.cta_target || "", priority: row.priority || 0, status: row.status, placement: row.placements?.[0] || "DASHBOARD", audience: row.audiences?.[0] || "ALL", startsAt: row.starts_at?.slice(0, 16) || "", endsAt: row.ends_at?.slice(0, 16) || "" });
  }

  async function toggleCampaign(row) {
    try { await updateMarketingCampaign(row.id, { name: row.name, campaignType: row.campaign_type, title: row.title, shortMessage: row.short_message, ctaLabel: row.cta_label, ctaTarget: row.cta_target, priority: row.priority, status: row.status === "ACTIVE" ? "PAUSED" : "ACTIVE", placements: row.placements, audiences: row.audiences, startsAt: row.starts_at, endsAt: row.ends_at }); await refresh(); } catch (error) { setMessage(error.message); }
  }

  return <AdminLayout title={mode === "marketing" ? "Marketing Campaigns" : "Referral Administration"} subtitle="Platform-owner controls backed only by persisted, auditable records">
    {message && <p role="status">{message}</p>}
    {mode === "marketing" && <><div className="upgrade-plan-grid"><article className="upgrade-plan-card"><span>Impressions</span><strong>{analytics.impression || 0}</strong></article><article className="upgrade-plan-card"><span>Clicks</span><strong>{analytics.click || 0}</strong></article><article className="upgrade-plan-card"><span>Paid conversions</span><strong>{analytics.paid_conversion || 0}</strong></article></div><form onSubmit={saveCampaign} className="upgrade-hero"><h2>{campaign.id ? "Edit campaign" : "Create campaign"}</h2><p>Campaigns use explicit schedule, placement, and audience fields. Counters remain zero until real events are persisted.</p><label>Name <input value={campaign.name} onChange={(event) => setCampaign({ ...campaign, name: event.target.value })} required /></label><label>Title <input value={campaign.title} onChange={(event) => setCampaign({ ...campaign, title: event.target.value })} /></label><label>Message <input value={campaign.shortMessage} onChange={(event) => setCampaign({ ...campaign, shortMessage: event.target.value })} /></label><label>CTA label <input value={campaign.ctaLabel} onChange={(event) => setCampaign({ ...campaign, ctaLabel: event.target.value })} /></label><label>CTA target <input value={campaign.ctaTarget} onChange={(event) => setCampaign({ ...campaign, ctaTarget: event.target.value })} /></label><label>Priority <input type="number" min="0" max="100" value={campaign.priority} onChange={(event) => setCampaign({ ...campaign, priority: event.target.value })} /></label><label>Status <select value={campaign.status} onChange={(event) => setCampaign({ ...campaign, status: event.target.value })}><option>DRAFT</option><option>ACTIVE</option><option>PAUSED</option></select></label><label>Placement <select value={campaign.placement} onChange={(event) => setCampaign({ ...campaign, placement: event.target.value })}><option>DASHBOARD</option><option>REFERRAL_CENTER</option><option>UPGRADE</option></select></label><label>Audience <select value={campaign.audience} onChange={(event) => setCampaign({ ...campaign, audience: event.target.value })}><option>ALL</option><option>TRIAL</option><option>PAID</option></select></label><label>Starts <input type="datetime-local" value={campaign.startsAt} onChange={(event) => setCampaign({ ...campaign, startsAt: event.target.value })} /></label><label>Ends <input type="datetime-local" value={campaign.endsAt} onChange={(event) => setCampaign({ ...campaign, endsAt: event.target.value })} /></label><button>Save campaign</button></form></>}
    {!rows?.length ? <p>No real {mode === "marketing" ? "campaigns" : "referrals"} have been recorded. No sample metrics are shown.</p> : <div style={{ overflowX: "auto" }}><table><thead><tr>{Object.keys(rows[0]).map((key) => <th key={key}>{key}</th>)}<th>Actions</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}>{Object.values(row).map((value, index) => <td key={index}>{Array.isArray(value) ? value.join(", ") : String(value ?? "—")}</td>)}<td>{mode === "referrals" ? <>{["PENDING","QUALIFIED"].includes(row.status) && <button onClick={() => runReasonedAction(rejectReferral, row.id)}>Reject</button>}{data.rewards.filter((reward) => reward.referral_id === row.id && reward.status === "GRANTED").map((reward) => <button key={reward.id} onClick={() => runReasonedAction(reverseReferralReward, reward.id)}>Reverse reward</button>)}</> : <><button onClick={() => editCampaign(row)}>Edit</button><button onClick={() => toggleCampaign(row)}>{row.status === "ACTIVE" ? "Deactivate" : "Activate"}</button></>}</td></tr>)}</tbody></table></div>}
    {mode === "referrals" && <p>Every correction requires a reason. Reward reversals create an audit event; customer clients cannot grant rewards.</p>}
  </AdminLayout>;
}
