function StateShell({ title, message, actions, icon }) {
  return (
    <section className="vds-panel vds-state">
      <div className="vds-state__content">
        {icon ? <div aria-hidden="true">{icon}</div> : null}
        <h2 className="vds-state__title">{title}</h2>
        {message ? <p className="vds-state__message">{message}</p> : null}
        {actions ? <div className="vds-page__actions" style={{ justifyContent: "center", marginTop: 16 }}>{actions}</div> : null}
      </div>
    </section>
  );
}

export function EmptyState(props) {
  return <StateShell title="No records found" {...props} />;
}

export function ErrorState(props) {
  return <StateShell title="Something went wrong" {...props} />;
}

export function PermissionDeniedState(props) {
  return <StateShell title="Access denied" {...props} />;
}

export function LoadingState({ rows = 5 }) {
  return (
    <section className="vds-panel" aria-busy="true" aria-label="Loading">
      <div className="vds-panel__body" style={{ display: "grid", gap: 12 }}>
        {Array.from({ length: rows }).map((_, index) => (
          <div
            className="vds-skeleton"
            style={{ height: 18, width: `${Math.max(45, 100 - index * 7)}%` }}
            key={index}
          />
        ))}
      </div>
    </section>
  );
}