function ConfidenceBadge({ value = "UNKNOWN" }) {
  return <span className={`confidence-badge confidence-${String(value).toLowerCase()}`}>{value}</span>;
}

export default ConfidenceBadge;
