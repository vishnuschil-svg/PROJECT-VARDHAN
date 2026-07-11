function ImportSummary({ summary }) {
  const items = [
    ["Imported", summary?.imported || 0],
    ["Skipped", summary?.skipped || 0],
    ["Warnings", summary?.warnings || 0],
    ["Errors", summary?.errors || 0],
  ];

  return (
    <section className="smart-import-summary" aria-label="Import summary">
      {items.map(([label, value]) => (
        <div key={label}>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
    </section>
  );
}

export default ImportSummary;
