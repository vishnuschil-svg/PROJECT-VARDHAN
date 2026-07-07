import "./Table.css";

function Table({ 
  columns, 
  data = [], 
  onRowClick, 
  selectable = false,
  actions = null,
  loading = false,
  pagination = null,
  onPaginationChange = null
}) {
  return (
    <div className="table-container">
      <table className="admin-table">
        <thead>
          <tr>
            {selectable && (
              <th className="table-checkbox">
                <input type="checkbox" />
              </th>
            )}
            {columns.map((col) => (
              <th key={col.key} style={{ width: col.width }}>
                <div className="table-header-cell">
                  <span>{col.label}</span>
                  {col.sortable && <span className="sort-icon">⇅</span>}
                </div>
              </th>
            ))}
            {actions && <th className="table-actions-header">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} style={{ padding: 40, textAlign: "center" }}>
                <div className="loader">Loading...</div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} style={{ padding: 40, textAlign: "center", color: "var(--text-tertiary)" }}>
                No data available
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr key={idx} onClick={() => onRowClick?.(row)} className={onRowClick ? "clickable" : ""}>
                {selectable && (
                  <td className="table-checkbox">
                    <input type="checkbox" />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
                {actions && (
                  <td className="table-actions">
                    <div className="action-buttons">
                      {actions.map((action, aIdx) => (
                        <button
                          key={aIdx}
                          className={`action-btn action-${action.variant || "default"}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onClick?.(row);
                          }}
                          title={action.label}
                        >
                          {action.icon || action.label}
                        </button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {pagination && (
        <div className="table-pagination">
          <div className="pagination-info">
            Showing {pagination.from} to {pagination.to} of {pagination.total}
          </div>
          <div className="pagination-controls">
            <button
              onClick={() => onPaginationChange?.(pagination.current - 1)}
              disabled={pagination.current === 1}
            >
              Previous
            </button>
            <span className="pagination-current">{pagination.current}</span>
            <button
              onClick={() => onPaginationChange?.(pagination.current + 1)}
              disabled={pagination.current === pagination.pages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Table;
