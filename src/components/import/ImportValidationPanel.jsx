function ImportValidationPanel({ validation }) {
  const errors = validation?.errors || [];
  const warnings = validation?.warnings || [];

  return (
    <section className="smart-import-validation" aria-label="Import validation">
      <div>
        <strong>{errors.length}</strong>
        <span>Errors</span>
      </div>
      <div>
        <strong>{warnings.length}</strong>
        <span>Warnings</span>
      </div>
      <div>
        <strong>{validation?.validRows?.length || 0}</strong>
        <span>Valid rows</span>
      </div>
      {[...errors, ...warnings].slice(0, 6).map((issue, index) => (
        <p key={`${issue.type}-${issue.rowNumber}-${index}`}>
          Row {issue.rowNumber}: {issue.type} - {issue.message}
        </p>
      ))}
    </section>
  );
}

export default ImportValidationPanel;
