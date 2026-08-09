export function FormSection({
  title,
  description,
  actions,
  children,
  className = "",
}) {
  return (
    <section className={`vds-panel vds-form-section ${className}`.trim()}>
      <div className="vds-panel__body vds-form-section">
        <header className="vds-form-section__header">
          <div>
            <h2 className="vds-form-section__title">{title}</h2>
            {description ? <p className="vds-form-section__description">{description}</p> : null}
          </div>
          {actions}
        </header>
        <div className="vds-form-grid">{children}</div>
      </div>
    </section>
  );
}