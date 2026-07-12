import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, Bot, IndianRupee, FileText, Landmark, Plus, ReceiptText, Target, Users, WalletCards } from "lucide-react";
import ChitLayout from "../../components/chit/ChitLayout";
import Button from "../../components/common/Button";
import { useAuth } from "../../hooks/useAuth";
import { getBusinessHealthDashboardModel } from "../../services/businessHealthService";
import { getFinanceDashboardSummary } from "../../services/financeService";
import { getActivityTimeline } from "../../services/activityService";
import { getNotificationCenter } from "../../services/notificationService";
import "./ChitDashboard.css";

const ICONS = [Landmark, Users, WalletCards, AlertTriangle, IndianRupee, IndianRupee];
const ROUTES = ["/chits/groups", "/chits/members", "/chits/collections", "/chits/collections/pending", "/chits/finance", "/chits/finance"];
function ChitDashboard() {
  const navigate = useNavigate(); const { activeTenantContext } = useAuth();
  const model = useMemo(() => {
    const health = getBusinessHealthDashboardModel(activeTenantContext); const finance = getFinanceDashboardSummary(activeTenantContext);
    return { health, finance, activity: getActivityTimeline(activeTenantContext).slice(0,5), notifications: getNotificationCenter(activeTenantContext).notifications.slice(0,4) };
  }, [activeTenantContext]);
  return <ChitLayout title="MITRA NIDHI Home" subtitle={`${activeTenantContext?.workspace_label || "Business workspace"} · today’s work and verified business position`} actions={<><Button variant="secondary" icon={<WalletCards size={16}/>} onClick={() => navigate("/chits/collections")}>Record collection</Button><Button variant="primary" icon={<Plus size={16}/>} onClick={() => navigate("/chits/groups?create=1")}>Create or import chit</Button></>}>
    <div className="chit-command-dashboard">
      <section className="chit-command-hero"><div><span>Business health</span><h2>{model.health.health.status} · {model.health.health.score}%</h2><p>{model.health.health.aiSuggestion}</p></div><button onClick={() => navigate("/chits/reports")}>See calculation evidence <ArrowRight size={17}/></button></section>
      <section className="chit-command-kpis">{model.health.kpis.map((item,index) => { const Icon=ICONS[index]; return <button key={item.label} onClick={() => navigate(ROUTES[index])}><Icon size={20}/><span>{item.label}</span><strong>{item.value}</strong><small>{item.helper}</small></button>; })}</section>
      <section className="chit-daily-actions"><button onClick={() => navigate("/chits/collections")}><WalletCards/><span><strong>Today’s collections</strong><small>Record and reconcile a payment</small></span></button><button onClick={() => navigate("/chits/collections/pending")}><AlertTriangle/><span><strong>Pending recovery</strong><small>Follow up outstanding amounts</small></span></button><button onClick={() => navigate("/chits/auctions")}><Target/><span><strong>Auctions and lift</strong><small>Review eligibility and upcoming events</small></span></button><button onClick={() => navigate("/chits/receipts")}><ReceiptText/><span><strong>Recent receipts</strong><small>Print, download or share official proof</small></span></button></section>
      <div className="chit-dashboard-columns"><section><header><span>Recent activity</span><h2>What changed</h2></header><div className="chit-dashboard-list">{model.activity.length ? model.activity.map((item) => <button key={item.id} onClick={() => navigate(item.route)}><span><strong>{item.title}</strong><small>{item.description}</small></span><ArrowRight size={16}/></button>) : <div className="chit-dashboard-empty">No activity yet. Create a group or add a member to begin.</div>}</div></section><section><header><span>AI recommended</span><h2>Actions backed by your data</h2></header><div className="chit-dashboard-list">{model.notifications.length ? model.notifications.map((item) => <button key={item.id} onClick={() => navigate(item.actionRoute)}><span><strong>{item.title}</strong><small>{item.message}</small></span><ArrowRight size={16}/></button>) : <div className="chit-dashboard-empty"><Bot size={20}/> Recommendations appear only when repository evidence is available.</div>}</div></section></div>
      <section className="chit-finance-strip"><div><FileText/><span><strong>{model.finance.metrics.find((x)=>x.key==="netProfit")?.displayValue}</strong><small>Verified net profit</small></span></div><div><IndianRupee/><span><strong>{model.finance.metrics.find((x)=>x.key==="pendingCollection")?.displayValue}</strong><small>Pending collection</small></span></div><button onClick={() => navigate("/chits/finance")}>Open finance and profit <ArrowRight size={17}/></button></section>
    </div>
  </ChitLayout>;
}
export default ChitDashboard;
