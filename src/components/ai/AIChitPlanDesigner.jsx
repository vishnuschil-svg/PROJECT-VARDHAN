import { useState } from "react";
import { CheckCircle2, Save, Sparkles } from "lucide-react";
import {
  createChitGroupFromAIPlan,
  designAIChitPlan,
  saveAIChitPlanDraft,
} from "../../services/ai/aiChitPlanService";

const DEFAULT_INPUT = {
  chitName: "AI Designed Chit",
  chitValue: 100000,
  members: 10,
  duration: 10,
  commission: 5,
  auctionType: "Auction",
};

function AIChitPlanDesigner({ activeTenantContext }) {
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [plan, setPlan] = useState(() => designAIChitPlan(DEFAULT_INPUT));
  const [message, setMessage] = useState("");

  const updateInput = (field, value) => {
    setInput((current) => ({ ...current, [field]: value }));
  };
  const generatePlan = () => {
    setPlan(designAIChitPlan(input));
    setMessage("Plan generated locally. Review totals before saving.");
  };
  const saveDraft = () => {
    const draft = saveAIChitPlanDraft({ input, plan, activeTenantContext });
    setMessage(`Draft saved: ${draft.chitName}`);
  };
  const createGroup = () => {
    if (!plan.validation.isValid) {
      setMessage(plan.validation.errors[0]);
      return;
    }
    const group = createChitGroupFromAIPlan({ input, plan, activeTenantContext });
    setMessage(`Chit group draft created: ${group.chit_name}`);
  };

  return (
    <section className="vardhan-ai-panel">
      <div className="vardhan-ai-panel-header">
        <div>
          <span>AI Chit Plan Designer</span>
          <h3>Design month-wise chit schedule</h3>
        </div>
        <button type="button" onClick={generatePlan}><Sparkles size={16} /> Generate</button>
      </div>
      <div className="vardhan-ai-form-grid">
        {[
          ["chitName", "Chit Name", "text"],
          ["chitValue", "Chit Value", "number"],
          ["members", "Members", "number"],
          ["duration", "Duration", "number"],
          ["commission", "Commission %", "number"],
          ["auctionType", "Auction Type", "text"],
        ].map(([field, label, type]) => (
          <label key={field}>
            <span>{label}</span>
            <input type={type} value={input[field]} onChange={(event) => updateInput(field, event.target.value)} />
          </label>
        ))}
      </div>
      <div className="vardhan-ai-summary-grid">
        <Metric label="Installment" value={plan.schedule[0]?.installment} />
        <Metric label="Total Prize" value={plan.totals.prize} />
        <Metric label="Dividend" value={plan.totals.dividend} />
        <Metric label="Commission" value={plan.totals.commission} />
        <Metric label="Owner Profit" value={plan.totals.ownerProfit} />
      </div>
      <div className="vardhan-ai-table-wrap">
        <table>
          <thead><tr><th>Month</th><th>Prize</th><th>Discount</th><th>Dividend</th><th>Commission</th><th>Profit</th></tr></thead>
          <tbody>
            {plan.schedule.map((row) => (
              <tr key={row.month}>
                <td>{row.month}</td>
                <td>{formatMoney(row.prizeAmount)}</td>
                <td>{formatMoney(row.discount)}</td>
                <td>{formatMoney(row.dividend)}</td>
                <td>{formatMoney(row.commission)}</td>
                <td>{formatMoney(row.ownerProfit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(plan.validation.errors.length > 0 || plan.validation.warnings.length > 0) && (
        <div className="vardhan-ai-validation">
          {plan.validation.errors.map((item) => <span className="error" key={item}>{item}</span>)}
          {plan.validation.warnings.map((item) => <span key={item}>{item}</span>)}
        </div>
      )}
      {message && <p className="vardhan-ai-message">{message}</p>}
      <div className="vardhan-ai-actions">
        <button type="button" onClick={saveDraft}><Save size={16} /> Save Draft</button>
        <button type="button" onClick={createGroup}><CheckCircle2 size={16} /> Create Chit Group</button>
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return <div><span>{label}</span><strong>{formatMoney(value)}</strong></div>;
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));
}

export default AIChitPlanDesigner;
