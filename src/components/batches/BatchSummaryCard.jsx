function BatchSummaryCard({ batch, summary }) {
  return (
    <article className="batch-summary-card">
      <div>
        <span>{batch.code}</span>
        <h3>{batch.name}</h3>
        <p>{batch.description || "No description"}</p>
      </div>
      <div className="batch-summary-grid">
        <div><span>Groups</span><strong>{summary.groupCount}</strong></div>
        <div><span>Collections</span><strong>{summary.collectionTotal}</strong></div>
        <div><span>Pending</span><strong>{summary.pending}</strong></div>
        <div><span>Profit</span><strong>{summary.profit}</strong></div>
      </div>
    </article>
  );
}

export default BatchSummaryCard;
