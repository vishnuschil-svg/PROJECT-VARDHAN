export function Breadcrumb({ items = [], onNavigate }) {
  if (!items.length) {
    return null;
  }

  return (
    <nav className="vds-breadcrumb" aria-label="Breadcrumb">
      <ol className="vds-breadcrumb__list">
        {items.map((item, index) => {
          const current = index === items.length - 1 || item.current;

          return (
            <li className="vds-breadcrumb__item" key={`${item.label}-${index}`}>
              {item.href && !current ? (
                <a className="vds-breadcrumb__action" href={item.href}>
                  {item.label}
                </a>
              ) : item.onClick && !current ? (
                <button
                  type="button"
                  className="vds-breadcrumb__action"
                  onClick={item.onClick}
                >
                  {item.label}
                </button>
              ) : onNavigate && item.path && !current ? (
                <button
                  type="button"
                  className="vds-breadcrumb__action"
                  onClick={() => onNavigate(item.path)}
                >
                  {item.label}
                </button>
              ) : (
                <span className="vds-breadcrumb__action" aria-current={current ? "page" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}