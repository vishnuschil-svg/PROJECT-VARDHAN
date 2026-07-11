import { useMemo, useState } from "react";
import { listOrganizerPreferences, rememberOrganizerPreference, suggestOrganizerPreferences } from "../../services/organizerLearningService.js";

function OrganizerMemoryPanel({ activeTenantContext, onApply }) {
  const [version, setVersion] = useState(0);
  const preferences = useMemo(() => listOrganizerPreferences(activeTenantContext), [activeTenantContext, version]);
  const suggestions = useMemo(() => suggestOrganizerPreferences(activeTenantContext), [activeTenantContext, version]);
  const seedPreference = () => {
    rememberOrganizerPreference({
      key: "liftEffectiveRule",
      value: "NEXT_MONTH",
      confidence: 0.9,
      source: "CONFIRMED_TEMPLATE",
      confirmedBy: "local-owner",
    }, activeTenantContext);
    setVersion((current) => current + 1);
  };

  return (
    <div className="chit-studio-card">
      <div className="chit-studio-section-head">
        <h3>Organizer Memory</h3>
        <button type="button" onClick={seedPreference}>Remember Default Lift Rule</button>
      </div>
      {!preferences.length && <p className="chit-studio-muted">No learned preferences yet. Confirmed preferences only are remembered.</p>}
      <div className="organizer-memory-list">
        {suggestions.map((item) => (
          <article key={item.id || `${item.key}-${item.version}`}>
            <strong>{item.key}</strong>
            <p>{item.message}</p>
            <span>Source: {item.source} / {item.confirmedAt}</span>
            <div>
              <button type="button" onClick={() => onApply?.(item)}>Apply</button>
              <button type="button" onClick={() => onApply?.({ ...item, edit: true })}>Edit</button>
              <button type="button">Ignore</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default OrganizerMemoryPanel;
