import { CalendarClock, CheckCircle2, Gauge, Trophy, UsersRound } from "lucide-react";

function ChitLifecycleWidget({ model }) {
  if (!model) {
    return null;
  }

  const metrics = [
    { label: "Running Month", value: model.currentRunningMonth, icon: CalendarClock },
    { label: "Current Winner", value: model.currentWinner, icon: Trophy },
    { label: "Next Auction", value: model.nextAuction, icon: UsersRound },
    { label: "Completion", value: `${model.completionPercent}%`, icon: Gauge },
  ];

  return (
    <section className="royal-chit-lifecycle" aria-label="Chit lifecycle">
      <div className="royal-chit-lifecycle-header">
        <div>
          <span className="royal-dashboard-eyebrow">Complete Chit Lifecycle Engine</span>
          <h3>{model.groupName}</h3>
          <p>{model.validationMessage}</p>
        </div>
        <div className="royal-chit-lifecycle-status">
          <CheckCircle2 size={16} />
          <span>{model.stageProgress.completed}/{model.stageProgress.total} stages</span>
        </div>
      </div>

      <div className="royal-chit-lifecycle-grid">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article className="royal-chit-lifecycle-card" key={metric.label}>
              <div aria-hidden="true">
                <Icon size={18} />
              </div>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </article>
          );
        })}
      </div>

      <div className="royal-chit-lifecycle-progress">
        <div>
          <span>Collections Progress</span>
          <strong>{model.collectionsProgress.percent}%</strong>
        </div>
        <div className="royal-chit-lifecycle-track">
          <i style={{ width: `${model.collectionsProgress.percent}%` }} />
        </div>
        <p>
          {model.collectionsProgress.collected} collected of {model.collectionsProgress.expected}.
          Pending {model.collectionsProgress.pending}.
        </p>
      </div>

      <div className="royal-chit-lifecycle-strip">
        <span>Month close: <strong>{model.monthClosingStatus}</strong></span>
        <span>Reusable slots: <strong>{model.activeSlots.reusableSlots}</strong></span>
        <span>Automation: <strong>{model.automation.businessHealth}</strong></span>
      </div>
    </section>
  );
}

export default ChitLifecycleWidget;
