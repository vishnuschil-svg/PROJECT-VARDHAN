function ClarificationPanel({ questions = [] }) {
  return (
    <div className="chit-studio-card">
      <h3>Clarification Interview</h3>
      {questions.length ? questions.map((item) => <p key={item.id}>{item.question}</p>) : <p className="chit-studio-muted">No clarification questions yet.</p>}
    </div>
  );
}

export default ClarificationPanel;
