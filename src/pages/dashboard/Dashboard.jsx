import { useMemo, useState } from "react";
import { Bell, Bot, ChevronRight, Globe2, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../hooks/useAuth";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useLocale } from "../../contexts/LocaleContext";
import { getVardhanHomeModel, VARDHAN_HOME_ACTIONS } from "../../services/vardhanHomeService";
import "./VardhanHome.css";

const LOCALES = [["en-IN", "English"], ["te-IN", "Telugu"], ["hi-IN", "Hindi"], ["ta-IN", "Tamil"], ["kn-IN", "Kannada"]];
function Dashboard() {
  const navigate = useNavigate();
  const auth = useAuth();
  const workspaceState = useWorkspace();
  const { locale, setLocale } = useLocale();
  const [query, setQuery] = useState("");
  const workspace = workspaceState.activeWorkspace || auth.activeWorkspace;
  const tenantContext = workspaceState.activeWorkspaceContext || auth.activeTenantContext;
  const model = useMemo(() => getVardhanHomeModel({ tenantContext, workspace, workspaces: workspaceState.workspaces, modules: auth.modules, profile: auth.profile, role: auth.role }), [tenantContext, workspace, workspaceState.workspaces, auth.modules, auth.profile, auth.role]);
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";
  const searchable = [...model.applications.map((item) => ({ label: item.name, route: item.path, enabled: item.launchable })), ...VARDHAN_HOME_ACTIONS.map(([label, route]) => ({ label, route, enabled: true }))];
  const results = query.trim() ? searchable.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())).slice(0, 6) : [];
  return <DashboardLayout><main className="os-home">
    <header className="os-command-header">
      <div><span className="os-eyebrow">VARDHAN OS · Business Command Center</span><h1>{greeting}, {auth.profile?.full_name?.split(" ")[0] || "Organizer"}</h1><p>{workspace?.businessName || workspace?.label || auth.company?.company_name || "Your business workspace"}</p></div>
      <div className="os-header-tools">
        {workspaceState.workspaces.length > 1 && <select aria-label="Business workspace" value={workspace?.id || ""} onChange={(e) => workspaceState.switchWorkspace(e.target.value)}>{workspaceState.workspaces.map((item) => <option key={item.id} value={item.id}>{item.businessName || item.label}</option>)}</select>}
        <label className="os-search"><Search size={18}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search apps and actions" /></label>
        <label className="os-language"><Globe2 size={17}/><select aria-label="Language" value={locale} onChange={(e) => setLocale(e.target.value)}>{LOCALES.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button type="button" onClick={() => navigate("/chits")} aria-label="Open AI"><Bot size={19}/></button>
        <button type="button" onClick={() => navigate("/admin/notifications")} aria-label={`${model.unreadCount} unread notifications`}><Bell size={19}/>{model.unreadCount > 0 && <b>{model.unreadCount}</b>}</button>
      </div>
      {results.length > 0 && <div className="os-search-results">{results.map((item) => <button key={`${item.label}-${item.route}`} disabled={!item.enabled} onClick={() => navigate(item.route)}>{item.label}<ChevronRight size={16}/></button>)}</div>}
    </header>

    <section className="os-health"><div><Sparkles size={20}/><span>AI business summary</span><h2>{model.health.status} health · {model.health.score}%</h2><p>{model.health.aiSuggestion}</p></div><button onClick={() => navigate("/chits/reports")}>View evidence <ChevronRight size={17}/></button></section>
    <section><div className="os-section-title"><div><span>Owner summary</span><h2>What needs your attention</h2></div></div><div className="os-summary-grid">{model.summary.map((item) => <button key={item.label} onClick={() => navigate(item.route)}><span>{item.label}</span><strong>{item.value}</strong>{item.helper && <small>{item.helper}</small>}</button>)}</div></section>
    <section><div className="os-section-title"><div><span>Applications</span><h2>Your VARDHAN OS</h2></div><button onClick={() => navigate("/products/catalog")}>Manage subscriptions</button></div><div className="os-app-grid">{model.applications.map((app, index) => <article key={app.id} className={`os-app-card accent-${index}`}><div className="os-app-head"><span>{app.shortName}</span><b>{app.state}</b></div><h3>{app.name}</h3><p>{app.summary}</p><small>{app.subscription ? `${app.subscription.planType} · ${app.subscription.status}` : app.implemented ? "No active tenant subscription found" : "Not sold as a completed product"}</small><button disabled={!app.launchable} onClick={() => navigate(app.path)}>{app.launchable ? "Open application" : app.state}<ChevronRight size={17}/></button></article>)}</div></section>
    <section><div className="os-section-title"><div><span>Quick actions</span><h2>Start real work</h2></div></div><div className="os-action-grid">{VARDHAN_HOME_ACTIONS.map(([label, route]) => <button key={label} onClick={() => navigate(route)}>{label}<ChevronRight size={16}/></button>)}</div></section>
    <div className="os-two-column"><section><div className="os-section-title"><div><span>Recent activity</span><h2>Workspace timeline</h2></div></div><div className="os-list">{model.activities.length ? model.activities.map((item) => <button key={item.id} onClick={() => navigate(item.route)}><span><strong>{item.title}</strong><small>{item.description}</small></span><ChevronRight size={17}/></button>) : <div className="os-empty">No business activity yet. Add a group or member to begin.</div>}</div></section><section><div className="os-section-title"><div><span>Recommended</span><h2>AI-guided next actions</h2></div></div><div className="os-list">{model.insights.length ? model.insights.map((item) => <button key={item.id} onClick={() => navigate(item.actionRoute)}><span><strong>{item.title}</strong><small>{item.message}</small></span><ChevronRight size={17}/></button>) : <div className="os-empty"><ShieldCheck size={20}/> AI recommendations will use repository evidence when business data is available.</div>}</div></section></div>
    <nav className="os-mobile-nav" aria-label="Mobile navigation"><button onClick={() => navigate("/dashboard")}>Home</button><button onClick={() => navigate("/products/catalog")}>Apps</button><button onClick={() => navigate("/chits")}>AI</button><button onClick={() => navigate("/admin/support")}>Support</button></nav>
  </main></DashboardLayout>;
}
export default Dashboard;
