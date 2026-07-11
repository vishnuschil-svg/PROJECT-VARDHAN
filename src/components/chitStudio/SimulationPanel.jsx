function SimulationPanel({ simulation }) {
  if (!simulation) return <div className="chit-studio-info">Simulation is an estimate based on entered assumptions.</div>;
  return (
    <div className="chit-studio-card">
      <h3>Simulation</h3>
      <p>{simulation.advisory}</p>
      <div className="chit-studio-summary-grid">
        <div><span>Collection</span><strong>{simulation.estimatedCollection}</strong></div>
        <div><span>Payout</span><strong>{simulation.estimatedPayoutObligation}</strong></div>
        <div><span>Risk</span><strong>{simulation.cashFlowRisk}</strong></div>
        <div><span>Profit</span><strong>{simulation.profitEstimate}</strong></div>
      </div>
    </div>
  );
}

export default SimulationPanel;
