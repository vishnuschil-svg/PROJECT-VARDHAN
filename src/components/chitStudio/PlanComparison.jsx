function PlanComparison({ proposals = [], selectedProposalId, onSelect }) {
  if (!proposals.length) return <div className="chit-studio-empty">Generate plans to compare Safe, Balanced and Growth options.</div>;
  return (
    <div className="chit-studio-plan-grid">
      {proposals.map((proposal) => (
        <button type="button" className={selectedProposalId === proposal.id ? "active" : ""} onClick={() => onSelect(proposal.id)} key={proposal.id}>
          <strong>{proposal.name}</strong>
          <span>{proposal.risk}</span>
          <small>{proposal.schedule.length} months, {proposal.ruleSet.paymentPatternType}</small>
          {proposal.riskWarnings.map((warning) => <em key={warning}>{warning}</em>)}
        </button>
      ))}
    </div>
  );
}

export default PlanComparison;
