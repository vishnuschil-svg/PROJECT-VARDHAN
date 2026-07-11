import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Database,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { AI_INSIGHT_TYPES } from "../../services/aiInsightsService";

const INSIGHT_ICONS = {
  [AI_INSIGHT_TYPES.COLLECTION_GROWTH]: TrendingUp,
  [AI_INSIGHT_TYPES.PENDING_RISK]: ShieldAlert,
  [AI_INSIGHT_TYPES.OVERDUE_MEMBERS]: AlertTriangle,
  [AI_INSIGHT_TYPES.PROFIT_TREND]: BarChart3,
  [AI_INSIGHT_TYPES.AUCTION_REMINDER]: CalendarClock,
  [AI_INSIGHT_TYPES.DATA_QUALITY]: Database,
  [AI_INSIGHT_TYPES.BUSINESS_HEALTH]: CheckCircle2,
};

function AIInsights({ insights, onInsightAction }) {
  return (
    <section className="royal-ai-insights" aria-label="AI insights">
      <div className="royal-ai-insights-header">
        <div>
          <span className="royal-dashboard-eyebrow">AI Insights Engine</span>
          <h3>Recommended next moves</h3>
        </div>
        <div className="royal-ai-insights-badge">
          <Sparkles size={17} />
          <span>{insights.length} live insights</span>
        </div>
      </div>

      <div className="royal-ai-insights-grid">
        {insights.map((insight) => {
          const Icon = INSIGHT_ICONS[insight.type] || Sparkles;

          return (
            <article
              className={`royal-ai-insight-card royal-ai-insight-${insight.priority}`}
              key={insight.id}
            >
              <div className="royal-ai-insight-icon" aria-hidden="true">
                <Icon size={20} />
              </div>
              <div className="royal-ai-insight-body">
                <div className="royal-ai-insight-title-row">
                  <h4>{insight.title}</h4>
                  <span>{insight.priority}</span>
                </div>
                <p>{insight.message}</p>
                <button
                  type="button"
                  className="royal-ai-insight-action"
                  onClick={() => onInsightAction(insight.actionRoute)}
                >
                  {insight.actionLabel}
                  <ArrowRight size={16} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default AIInsights;
