function FinalChitPreview({ basic = {}, validation, onCreate, onSaveTemplate }) {
  const errors = [
    ...(validation?.schedule?.errors || []).map((issue) => issue.message || issue),
    ...(validation?.ruleSet?.errors || []),
  ];
  return (
    <div className="chit-studio-card">
      <h3>Preview & Confirm</h3>
      <div className="chit-studio-summary-grid">
        <div><span>Name</span><strong>{basic.chitName || "Untitled"}</strong></div>
        <div><span>Value</span><strong>{basic.chitValue || 0}</strong></div>
        <div><span>Members</span><strong>{basic.totalMembers || basic.members || 0}</strong></div>
        <div><span>Months</span><strong>{basic.totalMonths || basic.duration || 0}</strong></div>
      </div>
      {errors.length > 0 && <div className="chit-studio-error">{errors.join(" ")}</div>}
      <div className="chit-studio-action-row">
        <button type="button" onClick={onSaveTemplate}>Save as Template</button>
        <button type="button" className="chit-studio-primary" onClick={onCreate} disabled={errors.length > 0}>Create Chit Group</button>
      </div>
    </div>
  );
}

export default FinalChitPreview;
