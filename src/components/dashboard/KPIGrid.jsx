import KPICard from "./KPICard";

function KPIGrid({ items }) {
  return (
    <section className="royal-kpi-grid" aria-label="Key performance indicators">
      {items.map((item) => (
        <KPICard key={item.label} {...item} />
      ))}
    </section>
  );
}

export default KPIGrid;
