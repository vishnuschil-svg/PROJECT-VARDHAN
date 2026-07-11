function BatchForm({ value, groups = [], onChange }) {
  const set = (field, nextValue) => onChange({ ...value, [field]: nextValue });
  const toggleGroup = (groupId) => {
    const current = new Set(value.groupIds || []);
    if (current.has(groupId)) current.delete(groupId);
    else current.add(groupId);
    set("groupIds", Array.from(current));
  };

  return (
    <div className="batch-form">
      <label>Name<input value={value.name || ""} onChange={(event) => set("name", event.target.value)} /></label>
      <label>Code<input value={value.code || ""} onChange={(event) => set("code", event.target.value)} /></label>
      <label>Description<textarea value={value.description || ""} onChange={(event) => set("description", event.target.value)} /></label>
      <label>Status<select value={value.status || "ACTIVE"} onChange={(event) => set("status", event.target.value)}><option>ACTIVE</option><option>INACTIVE</option><option>ARCHIVED</option></select></label>
      <label>Start Date<input type="date" value={value.startDate || ""} onChange={(event) => set("startDate", event.target.value)} /></label>
      <label>End Date<input type="date" value={value.endDate || ""} onChange={(event) => set("endDate", event.target.value)} /></label>
      <div className="batch-group-picker">
        <strong>Assign Chit Groups</strong>
        {groups.map((group) => (
          <label key={group.id}>
            <input type="checkbox" checked={(value.groupIds || []).includes(group.id)} onChange={() => toggleGroup(group.id)} />
            {group.chit_name}
          </label>
        ))}
      </div>
    </div>
  );
}

export default BatchForm;
