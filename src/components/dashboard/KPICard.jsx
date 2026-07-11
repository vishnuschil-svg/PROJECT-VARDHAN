function KPICard({ label, value, helper, tone = "neutral", icon: Icon }) {
  return (
    <article className={`royal-kpi-card royal-kpi-card-${tone}`}>
      <div className="royal-kpi-icon" aria-hidden="true">
        <Icon size={21} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{helper}</small>
      </div>
    </article>
  );
}

export default KPICard;
