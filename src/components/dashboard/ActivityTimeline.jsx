import {
  BadgeIndianRupee,
  BrainCircuit,
  Landmark,
  ReceiptText,
  Settings,
  ShieldCheck,
  Trophy,
  UserRound,
  WalletCards,
} from "lucide-react";

const ACTIVITY_ICONS = {
  Collection: BadgeIndianRupee,
  Receipt: ReceiptText,
  Member: UserRound,
  Auction: Trophy,
  Finance: WalletCards,
  Settings,
  AI: BrainCircuit,
  System: ShieldCheck,
};

function ActivityTimeline({ activities, onActivityOpen }) {
  return (
    <section className="royal-activity-timeline" aria-label="Activity timeline">
      <div className="royal-activity-header">
        <div>
          <span className="royal-dashboard-eyebrow">Activity Timeline</span>
          <h3>Latest enterprise movement</h3>
        </div>
        <Landmark size={24} aria-hidden="true" />
      </div>

      <div className="royal-activity-list">
        {activities.map((activity) => {
          const Icon = ACTIVITY_ICONS[activity.icon] || ShieldCheck;

          return (
            <button
              className="royal-activity-item"
              type="button"
              key={activity.id}
              onClick={() => onActivityOpen(activity.route)}
            >
              <span className="royal-activity-icon" aria-hidden="true">
                <Icon size={18} />
              </span>
              <span className="royal-activity-copy">
                <strong>{activity.title}</strong>
                <span>{activity.description}</span>
              </span>
              <time dateTime={activity.time}>{activity.time}</time>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default ActivityTimeline;
