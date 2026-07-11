function BeginnerDesigner({ value, onChange, onGenerate }) {
  const set = (field, nextValue) => onChange({ ...value, [field]: nextValue });
  return (
    <div className="chit-studio-card">
      <h3>Beginner AI Design</h3>
      <div className="chit-studio-form-grid">
        <label>Target chit value<input type="number" value={value.chitValue} onChange={(event) => set("chitValue", event.target.value)} /></label>
        <label>Members<input type="number" value={value.members} onChange={(event) => set("members", event.target.value)} /></label>
        <label>Duration<input type="number" value={value.duration} onChange={(event) => set("duration", event.target.value)} /></label>
        <label>Affordable monthly range<input value={value.monthlyRange} onChange={(event) => set("monthlyRange", event.target.value)} /></label>
        <label>Customer type<input value={value.customerType} onChange={(event) => set("customerType", event.target.value)} /></label>
        <label>Collection frequency<select value={value.collectionFrequency} onChange={(event) => set("collectionFrequency", event.target.value)}><option>Monthly</option><option>Daily</option><option>Weekly</option></select></label>
        <label>Risk preference<select value={value.riskPreference} onChange={(event) => set("riskPreference", event.target.value)}><option>SAFE</option><option>BALANCED</option><option>GROWTH</option></select></label>
        <label>Commission %<input type="number" value={value.commissionValue} onChange={(event) => set("commissionValue", event.target.value)} /></label>
      </div>
      <div className="chit-studio-toggle-row">
        {["auctionRequired", "luckyDrawRequired", "hybridRequired", "dailyCollectionNeeded", "memberReplacementAllowed"].map((field) => (
          <label key={field}><input type="checkbox" checked={Boolean(value[field])} onChange={(event) => set(field, event.target.checked)} /> {field}</label>
        ))}
      </div>
      <button type="button" className="chit-studio-primary" onClick={onGenerate}>Generate 3 Plans</button>
    </div>
  );
}

export default BeginnerDesigner;
