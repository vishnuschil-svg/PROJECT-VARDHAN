export function Badge({ tone = "neutral", className = "", children }) {
  return (
    <span className={`vds-badge vds-badge--${tone} ${className}`.trim()}>
      {children}
    </span>
  );
}

export function Alert({
  tone = "info",
  icon,
  title,
  children,
  className = "",
  role,
}) {
  const resolvedRole = role || (tone === "danger" ? "alert" : "status");

  return (
    <div className={`vds-alert vds-alert--${tone} ${className}`.trim()} role={resolvedRole}>
      <span aria-hidden="true">{icon || "â€¢"}</span>
      <div>
        {title ? <h3 className="vds-alert__title">{title}</h3> : null}
        <div className="vds-alert__message">{children}</div>
      </div>
    </div>
  );
}