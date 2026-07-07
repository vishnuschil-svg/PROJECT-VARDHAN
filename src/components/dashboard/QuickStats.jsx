function QuickStats() {
  const stats = [
    { label: "Total Products", value: "9", change: "+3%", type: "positive" },
    { label: "Active Licenses", value: "42", change: "+8%", type: "positive" },
    { label: "Total Users", value: "1,234", change: "-2%", type: "negative" },
    { label: "Revenue (This Month)", value: "$45.2K", change: "+12%", type: "positive" }
  ];

  return (
    <>
      {stats.map((stat, idx) => (
        <div key={idx} className="card solid">
          <div className="stat-card">
            <p className="stat-label">{stat.label}</p>
            <p className="stat-value">{stat.value}</p>
            <p className={`stat-change ${stat.type}`}>
              {stat.type === "positive" ? "↑" : "↓"} {stat.change} vs last month
            </p>
          </div>
        </div>
      ))}
    </>
  );
}

export default QuickStats;
