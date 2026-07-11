function CalculationExplanation({ explanation }) {
  if (!explanation) return null;
  return (
    <div className="chit-studio-info">
      <strong>{explanation.type}</strong>
      <p>{explanation.steps}</p>
    </div>
  );
}

export default CalculationExplanation;
