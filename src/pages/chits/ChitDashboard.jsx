import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Crown,
  FileText,
  Landmark,
  LineChart as LineChartIcon,
  Plus,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChitLayout from "../../components/chit/ChitLayout";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { CHIT_PRODUCT_NAME } from "../../config/erpModules";
import {
  CHIT_STATUS_VARIANTS,
  calculateChitDashboardStats,
  formatCurrency,
} from "../../config/chitPhaseOneData";
import { useAuth } from "../../hooks/useAuth";
import { listTenantGroups, listTenantMembers } from "../../services/chitDataService";
import {
  buildCollectionReceipts,
  useTenantCollections,
} from "../../services/chitCollectionsStore";
import "./ChitDashboard.css";

const CHART_MONTHS = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];

function ChitDashboard() {
  const navigate = useNavigate();
  const { activeTenantContext } = useAuth();
  const [loading, setLoading] = useState(true);
  const tenantGroups = listTenantGroups(activeTenantContext);
  const tenantMembers = listTenantMembers(activeTenantContext);
  const collections = useTenantCollections(activeTenantContext);
  const receipts = useMemo(() => buildCollectionReceipts(collections), [collections]);
  const stats = calculateChitDashboardStats(tenantGroups);

  useEffect(() => {
    setLoading(true);
    const timer = window.setTimeout(() => setLoading(false), 360);
    return () => window.clearTimeout(timer);
  }, [activeTenantContext?.tenant_id, activeTenantContext?.data_scope]);

  const dashboard = useMemo(
    () => buildExecutiveDashboard({
      collections,
      receipts,
      stats,
      tenantGroups,
      tenantMembers,
    }),
    [collections, receipts, stats, tenantGroups, tenantMembers]
  );

  const statCards = [
    {
      label: "Active Chits",
      value: stats.total_active_chits,
      detail: `${stats.total_members} members engaged`,
      icon: Landmark,
      tone: "royal",
    },
    {
      label: "Monthly Business",
      value: formatCurrency(stats.monthly_business),
      detail: "Projected active group value",
      icon: TrendingUp,
      tone: "gold",
    },
    {
      label: "Collections Today",
      value: formatCurrency(stats.todays_collections),
      detail: `${receipts.length} receipt records`,
      icon: WalletCards,
      tone: "emerald",
    },
    {
      label: "Outstanding",
      value: formatCurrency(stats.outstanding_amount),
      detail: `${formatCurrency(stats.pending_collections)} pending`,
      icon: Banknote,
      tone: "coral",
    },
  ];

  return (
    <ChitLayout
      title="Royal Enterprise Dashboard"
      subtitle={`${CHIT_PRODUCT_NAME} - ${activeTenantContext?.workspace_label || "Tenant"} command center`}
      actions={
        <div className="executive-actions-head">
          <Button
            variant="secondary"
            icon={<ReceiptText size={16} />}
            onClick={() => navigate("/chits/collections")}
          >
            Record Collection
          </Button>
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => navigate("/chits/groups?create=1")}
          >
            Create Group
          </Button>
        </div>
      }
    >
      <div className="royal-dashboard">
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <section className="royal-hero">
              <div className="royal-hero-copy">
                <span className="royal-eyebrow">
                  <Crown size={16} />
                  CEO Command View
                </span>
                <h1>Business clarity for every chit cycle.</h1>
                <p>
                  Monitor collections, cash flow, auctions and receipt movement
                  from one tenant-isolated executive workspace.
                </p>
                <div className="royal-tenant-strip">
                  <div>
                    <span>Workspace</span>
                    <strong>{activeTenantContext?.workspace_label || "Workspace"}</strong>
                  </div>
                  <div>
                    <span>Tenant ID</span>
                    <strong>{activeTenantContext?.tenant_id || "Not selected"}</strong>
                  </div>
                  <Badge
                    label={activeTenantContext?.data_scope || "no_scope"}
                    variant={activeTenantContext?.data_scope === "demo_sandbox" ? "warning" : "success"}
                    size="small"
                  />
                </div>
              </div>

              <div className="health-score-card">
                <div className="health-score-ring" style={{ "--score": dashboard.healthScore }}>
                  <strong>{dashboard.healthScore}</strong>
                  <span>Score</span>
                </div>
                <div>
                  <span className="health-label">Business Health</span>
                  <h2>{dashboard.healthLabel}</h2>
                  <p>{dashboard.healthInsight}</p>
                </div>
              </div>
            </section>

            <section className="executive-kpis">
              {statCards.map((card, index) => (
                <KpiCard key={card.label} card={card} index={index} />
              ))}
            </section>

            <section className="executive-grid">
              <ChartPanel
                className="span-2"
                icon={<LineChartIcon size={18} />}
                title="Month-on-Month Profit"
                subtitle="Executive margin trend from active business"
              >
                <ResponsiveContainer width="100%" height={270}>
                  <AreaChart data={dashboard.profitChart}>
                    <defs>
                      <linearGradient id="profitGold" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d4af37" stopOpacity={0.42} />
                        <stop offset="95%" stopColor="#d4af37" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(30, 58, 138, 0.12)" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={shortCurrency} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Area type="monotone" dataKey="profit" stroke="#d4af37" strokeWidth={3} fill="url(#profitGold)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartPanel>

              <PendingCollectionsWidget
                pendingItems={dashboard.pendingItems}
                total={stats.pending_collections}
                onView={() => navigate("/chits/collections/pending")}
              />

              <ChartPanel
                icon={<WalletCards size={18} />}
                title="Monthly Collections"
                subtitle="Paid amount trend"
              >
                <ResponsiveContainer width="100%" height={235}>
                  <BarChart data={dashboard.collectionsChart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(30, 58, 138, 0.12)" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={shortCurrency} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="collections" fill="#1d4ed8" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel
                icon={<Activity size={18} />}
                title="Cash Flow"
                subtitle="Inflow versus pending exposure"
              >
                <ResponsiveContainer width="100%" height={235}>
                  <LineChart data={dashboard.cashFlowChart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(30, 58, 138, 0.12)" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={shortCurrency} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Line type="monotone" dataKey="inflow" stroke="#1d4ed8" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="pending" stroke="#d4af37" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartPanel>
            </section>

            <section className="executive-lower-grid">
              <QuickActions onNavigate={navigate} />
              <UpcomingAuctions groups={dashboard.upcomingAuctions} />
              <RecentReceipts receipts={dashboard.recentReceipts} />
              <LiveActivity items={dashboard.activityItems} />
            </section>
          </>
        )}
      </div>
    </ChitLayout>
  );
}

function KpiCard({ card, index }) {
  const Icon = card.icon;

  return (
    <article className={`executive-kpi-card tone-${card.tone}`} style={{ "--delay": `${index * 70}ms` }}>
      <div className="kpi-icon">
        <Icon size={20} />
      </div>
      <span>{card.label}</span>
      <strong>{card.value}</strong>
      <p>{card.detail}</p>
    </article>
  );
}

function ChartPanel({ children, className = "", icon, title, subtitle }) {
  return (
    <article className={`royal-panel chart-panel ${className}`}>
      <div className="panel-title-row">
        <div>
          <span className="panel-icon">{icon}</span>
          <h2>{title}</h2>
        </div>
        <p>{subtitle}</p>
      </div>
      {children}
    </article>
  );
}

function PendingCollectionsWidget({ pendingItems, total, onView }) {
  return (
    <article className="royal-panel pending-widget">
      <div className="panel-title-row compact">
        <div>
          <span className="panel-icon"><ShieldCheck size={18} /></span>
          <h2>Pending Collections</h2>
        </div>
        <Button variant="ghost" icon={<ArrowUpRight size={16} />} onClick={onView}>
          View
        </Button>
      </div>
      <strong className="pending-total">{formatCurrency(total)}</strong>
      <div className="pending-list">
        {pendingItems.length === 0 ? (
          <div className="royal-empty">No pending collection records.</div>
        ) : (
          pendingItems.map((item) => (
            <div key={item.id} className="pending-row">
              <div>
                <strong>{item.member_name || item.chit_group_name || "Member"}</strong>
                <span>{item.month || item.chit_group_name || "Collection"}</span>
              </div>
              <b>{formatCurrency(item.pending_amount)}</b>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function QuickActions({ onNavigate }) {
  const actions = [
    { label: "New Group", path: "/chits/groups", icon: Plus },
    { label: "Add Member", path: "/chits/members", icon: Users },
    { label: "Collect", path: "/chits/collections", icon: WalletCards },
    { label: "Receipts", path: "/chits/receipts", icon: FileText },
  ];

  return (
    <article className="royal-panel quick-actions-panel">
      <div className="panel-title-row">
        <div>
          <span className="panel-icon"><Sparkles size={18} /></span>
          <h2>Executive Quick Actions</h2>
        </div>
        <p>Fast paths for daily operations</p>
      </div>
      <div className="quick-action-grid">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button key={action.label} type="button" onClick={() => onNavigate(action.path)}>
              <Icon size={18} />
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>
    </article>
  );
}

function UpcomingAuctions({ groups }) {
  return (
    <article className="royal-panel list-panel">
      <div className="panel-title-row">
        <div>
          <span className="panel-icon"><CalendarClock size={18} /></span>
          <h2>Upcoming Auctions</h2>
        </div>
        <p>Next group events</p>
      </div>
      <div className="royal-list">
        {groups.length === 0 ? (
          <div className="royal-empty">No upcoming auctions.</div>
        ) : (
          groups.map((group) => (
            <div key={group.id} className="royal-list-row">
              <div>
                <strong>{group.chit_name}</strong>
                <span>{group.chit_code}</span>
              </div>
              <time>{formatDate(group.next_auction_date)}</time>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function RecentReceipts({ receipts }) {
  return (
    <article className="royal-panel list-panel">
      <div className="panel-title-row">
        <div>
          <span className="panel-icon"><ReceiptText size={18} /></span>
          <h2>Recent Receipts</h2>
        </div>
        <p>Latest payment proof</p>
      </div>
      <div className="royal-list">
        {receipts.length === 0 ? (
          <div className="royal-empty">No receipt records yet.</div>
        ) : (
          receipts.map((receipt) => (
            <div key={receipt.id} className="royal-list-row">
              <div>
                <strong>{receipt.receipt_number || "Receipt"}</strong>
                <span>{receipt.payment_method || "Payment"}</span>
              </div>
              <b>{formatCurrency(receipt.amount)}</b>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function LiveActivity({ items }) {
  return (
    <article className="royal-panel activity-panel">
      <div className="panel-title-row">
        <div>
          <span className="panel-icon"><Activity size={18} /></span>
          <h2>Live Activity</h2>
        </div>
        <p>Tenant activity stream</p>
      </div>
      <div className="activity-timeline">
        {items.map((item) => (
          <div key={`${item.title}-${item.meta}`} className="activity-item">
            <span className="activity-dot"><CheckCircle2 size={14} /></span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.meta}</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton">
      <div className="skeleton hero" />
      <div className="skeleton-grid">
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
      <div className="skeleton chart" />
    </div>
  );
}

function buildExecutiveDashboard({ collections, receipts, stats, tenantGroups, tenantMembers }) {
  const paidTotal = collections.reduce((sum, item) => sum + Number(item.paid_amount || 0), 0);
  const pendingTotal = stats.pending_collections;
  const outstandingTotal = stats.outstanding_amount;
  const collectionRatio = stats.monthly_business
    ? Math.min(100, Math.round((paidTotal / stats.monthly_business) * 100))
    : stats.total_active_chits > 0 ? 72 : 0;
  const pendingPressure = outstandingTotal
    ? Math.min(35, Math.round((pendingTotal / outstandingTotal) * 100))
    : 0;
  const healthScore = Math.max(58, Math.min(99, 68 + collectionRatio - pendingPressure + stats.total_active_chits * 3));

  return {
    healthScore,
    healthLabel: healthScore >= 86 ? "Excellent Control" : healthScore >= 74 ? "Healthy Momentum" : "Needs Attention",
    healthInsight: `${stats.total_active_chits} active groups, ${tenantMembers.length} members and ${formatCurrency(pendingTotal)} pending.`,
    profitChart: buildProfitChart(stats, paidTotal),
    collectionsChart: buildCollectionsChart(collections, stats),
    cashFlowChart: buildCashFlowChart(stats, paidTotal),
    pendingItems: buildPendingItems(collections, tenantGroups),
    upcomingAuctions: tenantGroups
      .filter((group) => group.next_auction_date)
      .sort((a, b) => new Date(a.next_auction_date) - new Date(b.next_auction_date))
      .slice(0, 4),
    recentReceipts: [...receipts]
      .sort((a, b) => new Date(b.payment_date || b.created_at || 0) - new Date(a.payment_date || a.created_at || 0))
      .slice(0, 4),
    activityItems: buildActivityItems({ collections, receipts, tenantGroups, tenantMembers }),
  };
}

function buildProfitChart(stats, paidTotal) {
  const base = Math.max(stats.monthly_business * 0.12, paidTotal * 0.18, 18000);

  return CHART_MONTHS.map((month, index) => ({
    month,
    profit: Math.round(base * (0.72 + index * 0.08)),
  }));
}

function buildCollectionsChart(collections, stats) {
  if (collections.length === 0) {
    const base = Math.max(stats.todays_collections, stats.monthly_business / 6, 12000);
    return CHART_MONTHS.map((month, index) => ({
      month,
      collections: Math.round(base * (0.76 + index * 0.07)),
    }));
  }

  const byMonth = collections.reduce((result, item) => {
    const month = new Date(item.payment_date || item.created_at || Date.now()).toLocaleString("en-IN", { month: "short" });
    result[month] = (result[month] || 0) + Number(item.paid_amount || 0);
    return result;
  }, {});

  return CHART_MONTHS.map((month) => ({
    month,
    collections: byMonth[month] || 0,
  }));
}

function buildCashFlowChart(stats, paidTotal) {
  const inflowBase = Math.max(paidTotal / 6, stats.monthly_business / 8, 15000);
  const pendingBase = Math.max(stats.pending_collections / 6, 8000);

  return CHART_MONTHS.map((month, index) => ({
    month,
    inflow: Math.round(inflowBase * (0.86 + index * 0.05)),
    pending: Math.round(pendingBase * (1.12 - index * 0.04)),
  }));
}

function buildPendingItems(collections, tenantGroups) {
  const collectionPending = collections
    .filter((item) => Number(item.pending_amount || 0) > 0)
    .map((item) => ({
      ...item,
      pending_amount: Number(item.pending_amount || 0),
    }));

  if (collectionPending.length > 0) {
    return collectionPending.slice(0, 4);
  }

  return tenantGroups
    .filter((group) => Number(group.pending_collections || 0) > 0)
    .slice(0, 4)
    .map((group) => ({
      id: `pending-${group.id}`,
      chit_group_name: group.chit_name,
      pending_amount: Number(group.pending_collections || 0),
    }));
}

function buildActivityItems({ collections, receipts, tenantGroups, tenantMembers }) {
  const items = [
    ...collections.slice(-2).map((item) => ({
      title: `${item.member_name || "Member"} collection updated`,
      meta: `${formatCurrency(item.paid_amount)} collected for ${item.month || "current month"}`,
    })),
    ...receipts.slice(-2).map((receipt) => ({
      title: `${receipt.receipt_number || "Receipt"} generated`,
      meta: `${formatCurrency(receipt.amount)} via ${receipt.payment_method || "payment"}`,
    })),
    ...tenantGroups.slice(0, 1).map((group) => ({
      title: `${group.chit_name} is active`,
      meta: `${group.total_members} members, ${formatCurrency(group.monthly_amount)} monthly`,
    })),
  ];

  if (items.length === 0) {
    return [
      {
        title: "Workspace ready",
        meta: `${tenantMembers.length} members available for chit operations`,
      },
    ];
  }

  return items.slice(0, 5).reverse();
}

function shortCurrency(value) {
  const amount = Number(value || 0);
  if (amount >= 10000000) return `${Math.round(amount / 10000000)}Cr`;
  if (amount >= 100000) return `${Math.round(amount / 100000)}L`;
  if (amount >= 1000) return `${Math.round(amount / 1000)}K`;
  return amount;
}

function formatDate(value) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

export default ChitDashboard;
