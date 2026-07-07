function StatCard({ title, value, note }) {
  return (
    <div className="stat-card">
      <p>{title}</p>
      <h2>{value}</h2>
      <span>{note}</span>
    </div>
  );
}

export default StatCard;
