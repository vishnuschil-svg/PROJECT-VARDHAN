export function selectEligibleCampaigns(campaigns, { placement, audience = "ALL", now = new Date() } = {}) {
  const timestamp = now.getTime();
  return (campaigns || []).filter((campaign) => {
    const starts = campaign.starts_at ? new Date(campaign.starts_at).getTime() : -Infinity;
    const ends = campaign.ends_at ? new Date(campaign.ends_at).getTime() : Infinity;
    const audiences = campaign.audiences || ["ALL"];
    const placements = campaign.placements || [];
    return campaign.status === "ACTIVE" && starts <= timestamp && timestamp <= ends
      && (audiences.includes("ALL") || audiences.includes(audience))
      && (!placement || placements.includes(placement));
  });
}

export function aggregateCampaignEvents(events = []) {
  return events.reduce((totals, event) => {
    const key = String(event.event_type || "").toLowerCase();
    if (key) totals[key] = (totals[key] || 0) + 1;
    return totals;
  }, {});
}
