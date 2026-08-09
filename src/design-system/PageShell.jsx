import { Breadcrumb } from "./Breadcrumb";

export function AppShell({
  sidebar,
  header,
  children,
  className = "",
}) {
  return (
    <div className={`vds-root vds-shell ${className}`.trim()}>
      {sidebar}
      <div className="vds-main">
        {header}
        {children}
      </div>
    </div>
  );
}

export function PageShell({
  title,
  subtitle,
  breadcrumbItems = [],
  breadcrumbNavigate,
  actions,
  children,
  className = "",
}) {
  return (
    <main className={`vds-page ${className}`.trim()}>
      <div className="vds-page__header">
        <Breadcrumb items={breadcrumbItems} onNavigate={breadcrumbNavigate} />
        <div className="vds-page__title-row">
          <div>
            <h1 className="vds-page__title">{title}</h1>
            {subtitle ? <p className="vds-page__subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div className="vds-page__actions">{actions}</div> : null}
        </div>
      </div>
      {children}
    </main>
  );
}