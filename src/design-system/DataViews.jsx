export function Panel({
  title,
  actions,
  children,
  className = "",
}) {
  return (
    <section className={`vds-panel ${className}`.trim()}>
      {title || actions ? (
        <header className="vds-panel__header">
          {title ? <h2 className="vds-panel__title">{title}</h2> : <span />}
          {actions}
        </header>
      ) : null}
      <div className="vds-panel__body">{children}</div>
    </section>
  );
}

export function FilterBar({
  searchValue = "",
  searchPlaceholder = "Search",
  onSearchChange,
  children,
  className = "",
}) {
  return (
    <div className={`vds-filter-bar ${className}`.trim()}>
      <input
        type="search"
        className="vds-input vds-filter-bar__search"
        value={searchValue}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
        onChange={(event) => onSearchChange?.(event.target.value, event)}
      />
      {children}
    </div>
  );
}

export function DataTableShell({
  title,
  actions,
  filters,
  children,
  className = "",
}) {
  return (
    <section className={`vds-panel ${className}`.trim()}>
      {title || actions ? (
        <header className="vds-panel__header">
          {title ? <h2 className="vds-panel__title">{title}</h2> : <span />}
          {actions}
        </header>
      ) : null}
      {filters}
      <div className="vds-table-wrap">{children}</div>
    </section>
  );
}

export function KanbanBoard({ children, className = "" }) {
  return <div className={`vds-kanban ${className}`.trim()}>{children}</div>;
}

export function KanbanCard({ children, className = "", ...props }) {
  return (
    <article className={`vds-kanban-card ${className}`.trim()} {...props}>
      {children}
    </article>
  );
}