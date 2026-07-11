import { ArrowRight, Banknote, Coins, Landmark, ReceiptText, TrendingDown, Wallet } from "lucide-react";

const METRIC_ICONS = {
  todaysIncome: ReceiptText,
  todaysExpense: TrendingDown,
  cashInHand: Wallet,
  bankBalance: Landmark,
  netProfit: Coins,
  pendingCollection: Banknote,
};

function FinanceSummaryWidget({ model, onOpenFinance }) {
  if (!model) {
    return null;
  }

  return (
    <section className="royal-finance-summary" aria-label="Finance summary">
      <div className="royal-finance-summary-header">
        <div>
          <span className="royal-dashboard-eyebrow">Enterprise Financial Accounting</span>
          <h3>{model.title}</h3>
          <p>{model.subtitle}</p>
        </div>
        <button type="button" onClick={onOpenFinance}>
          Open Finance
          <ArrowRight size={16} />
        </button>
      </div>

      <div className="royal-finance-summary-grid">
        {model.metrics.map((metric) => {
          const Icon = METRIC_ICONS[metric.key] || Banknote;

          return (
            <article className={`royal-finance-summary-card tone-${metric.tone}`} key={metric.key}>
              <div className="royal-finance-summary-icon" aria-hidden="true">
                <Icon size={18} />
              </div>
              <span>{metric.label}</span>
              <strong>{metric.displayValue}</strong>
            </article>
          );
        })}
      </div>

      <div className="royal-finance-closing-strip">
        <span>Day Closing: <strong>{model.closing.dayStatus}</strong></span>
        <span>Month Closing: <strong>{model.closing.monthStatus}</strong></span>
        <span>Difference: <strong>{model.closing.difference}</strong></span>
      </div>
    </section>
  );
}

export default FinanceSummaryWidget;
