export function Sidebar({
  brandName = "VARDHAN",
  brandMark = "V",
  items = [],
  activePath,
  collapsed = false,
  footer,
  onNavigate,
  className = "",
}) {
  return (
    <aside className={`vds-sidebar ${collapsed ? "vds-sidebar--collapsed" : ""} ${className}`.trim()}>
      <div className="vds-sidebar__brand">
        <span className="vds-sidebar__brand-mark" aria-hidden="true">{brandMark}</span>
        <span className="vds-sidebar__brand-name">{brandName}</span>
      </div>

      <nav className="vds-sidebar__nav" aria-label="Primary navigation">
        {items.map((item) => {
          const active = item.path === activePath;

          return (
            <button
              type="button"
              key={item.id || item.path || item.label}
              className="vds-sidebar__item"
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              onClick={() => onNavigate?.(item.path, item)}
              disabled={item.disabled}
            >
              <span aria-hidden="true">{item.icon || "â€¢"}</span>
              <span className="vds-sidebar__label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {footer ? <div className="vds-sidebar__footer">{footer}</div> : null}
    </aside>
  );
}