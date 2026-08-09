export function Header({
  context,
  actions,
  className = "",
}) {
  return (
    <header className={`vds-header ${className}`.trim()}>
      <div className="vds-header__context">{context}</div>
      <div className="vds-header__actions">{actions}</div>
    </header>
  );
}