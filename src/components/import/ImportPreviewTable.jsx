function ImportPreviewTable({ preview }) {
  const rows = preview?.rows || [];
  const columns = preview?.columns || [];

  if (!rows.length) {
    return <p className="smart-import-empty">No preview rows available.</p>;
  }

  return (
    <div className="smart-import-table-wrap">
      <table className="smart-import-table">
        <thead>
          <tr>
            <th>Row</th>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.rowNumber}>
              <td>{row.rowNumber}</td>
              {columns.map((column) => (
                <td key={column}>{String(row.data?.[column] || "")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ImportPreviewTable;
