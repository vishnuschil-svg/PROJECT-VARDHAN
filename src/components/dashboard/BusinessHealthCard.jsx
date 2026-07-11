import { BrainCircuit, ShieldCheck, TrendingUp } from "lucide-react";

function BusinessHealthCard({ score, tone, title, summary, signals }) {
  return (
    <article className={`royal-business-health royal-business-health-${tone}`}>
      <div className="royal-business-health-copy">
        <span className="royal-dashboard-eyebrow">AI Business Health</span>
        <h3>{title}</h3>
        <p>{summary}</p>
      </div>

      <div className="royal-business-health-score" aria-label={`Business health score ${score} percent`}>
        <BrainCircuit size={28} />
        <strong>{score}%</strong>
        <span>Health Score</span>
      </div>

      <div className="royal-business-health-signals">
        {signals.map((signal) => {
          const Icon = signal.icon === "trend" ? TrendingUp : ShieldCheck;

          return (
            <div className="royal-business-health-signal" key={signal.label}>
              <Icon size={17} />
              <span>{signal.label}</span>
              <strong>{signal.value}</strong>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default BusinessHealthCard;
