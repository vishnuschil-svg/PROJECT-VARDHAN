import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Bell,
  Bot,
  IndianRupee,
  Command,
  FileBarChart,
  LayoutGrid,
  Search,
  Sparkles,
  TrendingUp,
  UsersRound,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../hooks/useAuth";
import { useLocale } from "../../contexts/LocaleContext";
import { getChitCommandDashboard } from "../../services/chitDashboardService";
import { getVardhanHomeModel, VARDHAN_HOME_ACTIONS } from "../../services/vardhanHomeService";
import "./VardhanHome.css";

const DashboardCharts = lazy(() => import("./DashboardCharts"));

const copy = {
  "en-IN": {
    eyebrow: "Operating command center",
    title: "Good to see you",
    subtitle: "A live, tenant-isolated view of your business today.",
    search: "Search apps, reports and actions",
    overview: "Business overview",
    overviewHint: "Live values from the active workspace",
    trend: "Collection trend",
    trendHint: "Actual receipts recorded this month",
    modes: "Payment modes",
    modesHint: "Recorded monthly collection split",
    apps: "Your workspace",
    appsHint: "Open a Vardhan product or workflow",
    actions: "Quick actions",
    ai: "Vardhan AI",
    aiHint: "Evidence-led operational guidance",
    noAi: "No verified suggestions right now.",
    noAiHint: "Insights appear only when tenant data supports them.",
    emptyChart: "No collection entries have been recorded this month.",
    noResults: "No matching destination found.",
    open: "Open",
  },
  "te-IN": {
    eyebrow: "వ్యాపార కమాండ్ సెంటర్",
    title: "మిమ్మల్ని మళ్లీ చూడటం ఆనందంగా ఉంది",
    subtitle: "మీ వ్యాపారానికి సంబంధించిన ప్రత్యక్ష, సురక్షిత దృశ్యం.",
    search: "యాప్‌లు, నివేదికలు, చర్యలను వెతకండి",
    overview: "వ్యాపార సమీక్ష",
    overviewHint: "ప్రస్తుత వర్క్‌స్పేస్ ప్రత్యక్ష విలువలు",
    trend: "వసూళ్ల ధోరణి",
    trendHint: "ఈ నెల నమోదు చేసిన అసలు రసీదులు",
    modes: "చెల్లింపు పద్ధతులు",
    modesHint: "నెలవారీ వసూళ్ల విభజన",
    apps: "మీ వర్క్‌స్పేస్",
    appsHint: "వర్ధన్ ఉత్పత్తి లేదా పనిని తెరవండి",
    actions: "త్వరిత చర్యలు",
    ai: "వర్ధన్ AI",
    aiHint: "ఆధారాలతో కూడిన నిర్వహణ సూచనలు",
    noAi: "ప్రస్తుతం ధృవీకరించిన సూచనలు లేవు.",
    noAiHint: "వర్క్‌స్పేస్ డేటా ఆధారం ఉన్నప్పుడే సూచనలు కనిపిస్తాయి.",
    emptyChart: "ఈ నెల వసూళ్లు ఇంకా నమోదు కాలేదు.",
    noResults: "సరిపోలే గమ్యం కనబడలేదు.",
    open: "తెరవండి",
  },
};

const KPI_ICONS = [WalletCards, UsersRound, IndianRupee, TrendingUp, Activity];
const BOTTOM_NAV = [
  { label: "Home", route: "/dashboard", icon: LayoutGrid },
  { label: "Products", route: "/products/catalog", icon: WalletCards },
  { label: "AI", route: "/chits/ai", icon: Bot },
  { label: "Reports", route: "/chits/reports", icon: FileBarChart },
];

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (index = 0) => ({ opacity: 1, y: 0, transition: { delay: index * 0.045, duration: 0.34 } }),
};

function money(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef(null);
  const [query, setQuery] = useState("");
  const { profile, role, modules, workspaceOptions, activeWorkspace, activeTenantContext } = useAuth();
  const { locale, setLocale } = useLocale();
  const text = copy[locale] || copy["en-IN"];

  const commandModel = useMemo(() => getChitCommandDashboard(activeTenantContext), [activeTenantContext]);
  const homeModel = useMemo(() => getVardhanHomeModel({
    tenantContext: activeTenantContext,
    workspace: activeWorkspace,
    workspaces: workspaceOptions,
    modules,
    profile,
    role,
  }), [activeTenantContext, activeWorkspace, modules, profile, role, workspaceOptions]);

  const destinations = useMemo(() => [
    ...homeModel.applications.filter((item) => item.launchable).map((item) => ({ label: item.name, route: item.path, type: "Product" })),
    ...VARDHAN_HOME_ACTIONS.map(([label, route]) => ({ label, route, type: "Action" })),
  ], [homeModel.applications]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return destinations.filter((item) => item.label.toLowerCase().includes(needle)).slice(0, 7);
  }, [destinations, query]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") setQuery("");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const paymentModes = commandModel.paymentModes.filter((item) => item.value > 0);
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || "there";

  return (
    <DashboardLayout>
      <div className="dashboard-v2">
        <motion.header className="v2-command-header" initial="hidden" animate="visible" variants={fadeUp}>
          <div className="v2-header-copy">
            <span className="v2-eyebrow"><Sparkles size={15} aria-hidden="true" /> {text.eyebrow}</span>
            <h1>{text.title}, {firstName}.</h1>
            <p>{text.subtitle}</p>
          </div>
          <div className="v2-header-actions">
            <button className="v2-language-toggle" type="button" onClick={() => setLocale(locale === "te-IN" ? "en-IN" : "te-IN")} aria-label={locale === "te-IN" ? "Switch to English" : "తెలుగుకు మార్చండి"}>
              <span className={locale === "en-IN" ? "active" : ""}>EN</span>
              <span className={locale === "te-IN" ? "active" : ""}>తె</span>
            </button>
            <button className="v2-alert-button" type="button" onClick={() => navigate("/admin/notifications")} aria-label={`${commandModel.notifications.unreadCount} unread notifications`}>
              <Bell size={19} aria-hidden="true" />
              {commandModel.notifications.unreadCount > 0 && <span>{Math.min(commandModel.notifications.unreadCount, 99)}</span>}
            </button>
          </div>
          <div className="v2-search-wrap">
            <Search size={19} aria-hidden="true" />
            <input
              id="dashboard-v2-search"
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && matches[0]) navigate(matches[0].route);
              }}
              placeholder={text.search}
              aria-label={text.search}
              role="combobox"
              aria-expanded={Boolean(query)}
              aria-controls="dashboard-search-results"
              aria-autocomplete="list"
            />
            {query ? <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={17} /></button> : <kbd><Command size={13} /> K</kbd>}
            {query && (
              <div className="v2-search-results" id="dashboard-search-results" role="listbox">
                {matches.length ? matches.map((item) => (
                  <button key={`${item.type}-${item.route}`} type="button" role="option" aria-selected="false" onClick={() => navigate(item.route)}>
                    <span><strong>{item.label}</strong><small>{item.type}</small></span><ArrowRight size={16} />
                  </button>
                )) : <p>{text.noResults}</p>}
              </div>
            )}
          </div>
        </motion.header>

        <div className="v2-content-grid">
          <div className="v2-main-column">
            <section aria-labelledby="business-overview-title">
              <div className="v2-section-heading">
                <div><h2 id="business-overview-title">{text.overview}</h2><p>{text.overviewHint}</p></div>
                <span className="v2-live-pill"><i /> Live</span>
              </div>
              <div className="v2-widget-grid">
                {commandModel.kpis.slice(0, 6).map((item, index) => {
                  const Icon = KPI_ICONS[index % KPI_ICONS.length];
                  return (
                    <motion.button custom={index} initial="hidden" animate="visible" variants={fadeUp} className="v2-metric-card" type="button" key={item.label} onClick={() => navigate(item.route)} aria-label={`${item.label}: ${item.value}`}>
                      <span className="v2-metric-icon"><Icon size={20} /></span>
                      <span className="v2-metric-content"><small>{item.label}</small><strong>{item.value}</strong><em>{item.helper || item.evidence}</em></span>
                      <ArrowRight className="v2-card-arrow" size={17} />
                    </motion.button>
                  );
                })}
              </div>
            </section>

            <Suspense fallback={<section className="v2-chart-grid" aria-label="Business analytics loading"><article className="v2-glass-card v2-trend-card" /><article className="v2-glass-card" /></section>}>
              <DashboardCharts commandModel={commandModel} paymentModes={paymentModes} text={text} money={money} fadeUp={fadeUp} />
            </Suspense>

            <section aria-labelledby="workspace-apps-title">
              <div className="v2-section-heading"><div><h2 id="workspace-apps-title">{text.apps}</h2><p>{text.appsHint}</p></div></div>
              <div className="v2-app-grid">
                {homeModel.applications.map((app, index) => (
                  <motion.button key={app.id} className={`v2-app-card ${app.launchable ? "" : "is-disabled"}`} type="button" disabled={!app.launchable} onClick={() => navigate(app.path)} initial="hidden" animate="visible" variants={fadeUp} custom={index}>
                    <span className="v2-app-icon"><Zap size={21} /></span>
                    <span><strong>{app.name}</strong><small>{app.state}</small></span>
                    <ArrowRight size={16} />
                  </motion.button>
                ))}
              </div>
            </section>

            <section aria-labelledby="quick-actions-title">
              <div className="v2-section-heading"><div><h2 id="quick-actions-title">{text.actions}</h2></div></div>
              <div className="v2-action-grid">
                {VARDHAN_HOME_ACTIONS.map(([label, route]) => <button key={route} type="button" onClick={() => navigate(route)}><span>{label}</span><ArrowRight size={15} /></button>)}
              </div>
            </section>
          </div>

          <aside className="v2-ai-panel" aria-labelledby="v2-ai-title">
            <div className="v2-ai-orb" aria-hidden="true"><Bot size={27} /></div>
            <span className="v2-ai-status"><i /> Tenant data connected</span>
            <h2 id="v2-ai-title">{text.ai}</h2>
            <p>{text.aiHint}</p>
            <div className="v2-ai-feed" aria-live="polite">
              {commandModel.insights.length ? commandModel.insights.map((insight) => (
                <article key={insight.id || insight.type || insight.title}>
                  <span><Sparkles size={14} /></span>
                  <div><strong>{insight.title}</strong><p>{insight.reason || insight.message}</p><small>Evidence: {insight.evidence}</small></div>
                </article>
              )) : <div className="v2-ai-empty"><Bot size={24} /><strong>{text.noAi}</strong><p>{text.noAiHint}</p></div>}
            </div>
            <button className="v2-ai-cta" type="button" onClick={() => navigate("/chits/ai")}><span>{text.open} {text.ai}</span><ArrowRight size={16} /></button>
          </aside>
        </div>

        <nav className="v2-bottom-nav" aria-label="Mobile primary navigation">
          {BOTTOM_NAV.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.route;
            return <button key={item.route} type="button" className={active ? "active" : ""} aria-current={active ? "page" : undefined} onClick={() => navigate(item.route)}><Icon size={20} /><span>{item.label}</span></button>;
          })}
        </nav>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
