import { ArrowUpDown } from "lucide-react";
import "./Table.css";

function Table({
  columns,
  data = [],
  onRowClick,
  selectable = false,
  actions = null,
  loading = false,
  pagination = null,
  onPaginationChange = null,
}) {
  const columnSpan = columns.length + (actions ? 1 : 0) + (selectable ? 1 : 0);

  return (
    <div className="table-container" aria-busy={loading}>
      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              {selectable && (
                <th className="table-checkbox">
                  <input type="checkbox" aria-label="Select all rows" />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key} style={{ width: col.width }}>
                  <div className="table-header-cell">
                    <span>{col.label}</span>
                    {col.sortable && (
                      <span className="sort-icon" aria-hidden="true">
                        <ArrowUpDown size={13} />
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {actions && <th className="table-actions-header">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columnSpan} className="table-state-cell">
                  <div className="table-loading-state" role="status" aria-label="Loading table data">
                    <span className="vds-skeleton" />
                    <span className="vds-skeleton" />
                    <span className="vds-skeleton" />
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columnSpan} className="table-state-cell">
                  <div className="table-empty-state">No data available</div>
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  onClick={() => onRowClick?.(row)}
                  className={onRowClick ? "clickable" : ""}
                >
                  {selectable && (
                    <td className="table-checkbox">
                      <input type="checkbox" aria-label={`Select row ${idx + 1}`} />
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
                        {actions.map((action, aIdx) => {
                          const disabled = typeof action.disabled === "function"
                            ? action.disabled(row)
                            : Boolean(action.disabled);
                          return (
                          <button
                            key={`${action.label}-${aIdx}`}
                            className={`action-btn action-${action.variant || "default"}`}
                            disabled={disabled}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (disabled) return;
                              action.onClick?.(row);
                            }}
                            title={action.label}
                            aria-label={action.label}
                          >
                            {action.icon || action.label}
                          </button>
                          );
                        })}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
