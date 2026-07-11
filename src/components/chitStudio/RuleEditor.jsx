function RuleEditor({ ruleSet = {}, onChange }) {
  const set = (field, value) => onChange({ ...ruleSet, [field]: value });
  return (
    <div className="chit-studio-card">
      <h3>Rule Set</h3>
      <div className="chit-studio-form-grid">
        <label>Payment pattern<select value={ruleSet.paymentPatternType || "FIXED"} onChange={(event) => set("paymentPatternType", event.target.value)}><option>FIXED</option><option>MONTH_WISE_VARIABLE</option><option>LIFTED_NON_LIFTED</option><option>AUCTION_DIVIDEND</option><option>PAYOUT_SCHEDULE</option><option>HYBRID</option><option>CUSTOM</option></select></label>
        <label>Lift effective<select value={ruleSet.liftEffectiveRule || "NEXT_MONTH"} onChange={(event) => set("liftEffectiveRule", event.target.value)}><option>NEXT_MONTH</option><option>SAME_MONTH</option><option>CUSTOM</option></select></label>
        <label>Winner lock<select value={ruleSet.winnerLockRule || "ONCE_LIFTED_LOCKED"} onChange={(event) => set("winnerLockRule", event.target.value)}><option>ONCE_LIFTED_LOCKED</option><option>CUSTOM</option></select></label>
        <label>Penalty type<select value={ruleSet.penaltyType || "NONE"} onChange={(event) => set("penaltyType", event.target.value)}><option>NONE</option><option>FIXED</option><option>PERCENTAGE</option><option>DAILY</option><option>MANUAL</option><option>CUSTOM</option></select></label>
        <label>Min bid<input type="number" value={ruleSet.minimumBidValue || 0} onChange={(event) => set("minimumBidValue", Number(event.target.value || 0))} /></label>
        <label>Max bid<input type="number" value={ruleSet.maximumBidValue || 100} onChange={(event) => set("maximumBidValue", Number(event.target.value || 0))} /></label>
        <label>Commission type<select value={ruleSet.commissionType || "PERCENTAGE"} onChange={(event) => set("commissionType", event.target.value)}><option>FIXED_AMOUNT</option><option>PERCENTAGE</option><option>MONTH_WISE</option><option>MANUAL</option><option>CUSTOM</option></select></label>
        <label>Commission value<input type="number" value={ruleSet.commissionValue || 5} onChange={(event) => set("commissionValue", Number(event.target.value || 0))} /></label>
      </div>
    </div>
  );
}

export default RuleEditor;
