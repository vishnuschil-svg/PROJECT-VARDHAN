import {
  AlertTriangle,
  Banknote,
  BarChart3,
  CalendarClock,
  ClipboardList,
  Coins,
  FileBarChart,
  MessageCircle,
  Plus,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Button from "../common/Button";
import {
  BUSINESS_HEALTH_TONES,
  buildBusinessHealthDashboard,
  getHealthTone,
} from "../../config/chitBusinessHealth";
import {
  PHASE_TWO_CHIT_MEMBERS,
  getTenantMembers,
} from "../../config/chitMemberData";
import {
  PHASE_ONE_CHIT_GROUPS,
  formatCurrency,
  getTenantChitGroups,
} from "../../config/chitPhaseOneData";
import { CHIT_PRODUCT_NAME } from "../../config/erpModules";
import { useAuth } from "../../hooks/useAuth";
import "./BusinessHealthDashboard.css";

const CARD_DEFINITIONS = [
  { key: "total_active_chits", label: "Total Active Chits", icon: ClipboardList },
  { key: "total_members", label: "Total Members", icon: Users },
  { key: "todays_collections", label: "Today's Collections", icon: ReceiptText, currency: true },
  { key: "monthly_collections", label: "Monthly Collections", icon: BarChart3, currency: true },
  { key: "pending_collections", label: "Pending Collections", icon: CalendarClock, currency: true },
  { key: "overdue_amount", label: "Overdue Amount", icon: AlertTriangle, currency: true },
  { key: "collection_percentage", label: "Collection Percentage", icon: TrendingUp, suffix: "%" },
  { key: "todays_auctions", label: "Today's Auctions", icon: Trophy },
  { key: "upcoming_auctions", label: "Upcoming Auctions", icon: CalendarClock },
  { key: "lifted_members", label: "Lifted Members", icon: Trophy },
  { key: "non_lifted_members", label: "Non-Lifted Members", icon: Users },
  { key: "cash_in_hand", label: "Cash in Hand", icon: Wallet, currency: true },
  { key: "bank_balance", label: "Bank Balance", icon: Banknote, currency: true },
  { key: "monthly_profit", label: "Monthly Profit", icon: Coins, currency: true },
  { key: "high_risk_members", label: "High Risk Members", icon: AlertTriangle },
];

const PIE_COLORS = ["#10b981", "#f59e0b", "#dc2626"];
const PAYMENT_COLORS = ["#d4af37", "#2563eb", "#0b1f3d", "#10b981"];

function BusinessHealthDashboard() {
  const navigate = useNavigate();
  const { activeTenantContext } = useAuth();

  const tenantGroups = useMemo(
    () => getTenantChitGroups(PHASE_ONE_CHIT_GROUPS, activeTenantContext),
    [activeTenantContext]
  );
  const tenantMembers = useMemo(
    () => getTenantMembers(PHASE_TWO_CHIT_MEMBERS, activeTenantContext),
    [activeTenantContext]
  );
  const health = useMemo(
    () => buildBusinessHealthDashboard({ groups: tenantGroups, members: tenantMembers }),
    [tenantGroups, tenantMembers]
  );

  const collectionTone = getHealthTone(
    "collection_percentage",
    health.stats.collection_percentage
  );

  return (
    <section className="business-health-dashboard" aria-label="Business Health Dashboard">
      <div className="business-health-hero">
        <div>
          <span className="health-eyebrow">MITRA NIDHI CHITI PRO Phase 6</span>
          <h2>Business Health Dashboard</h2>
          <p>
            A 5-second owner view of collections, auctions, cash position, lifted members,
            and risk across {CHIT_PRODUCT_NAME}.
          </p>
        </div>
        <div className={`health-score health-score-${collectionTone}`}>
          <ShieldCheck size={20} />
          <span>Collection Health</span>
          <strong>{health.stats.collection_percentage}%</strong>
        </div>
      </div>

      <div className="health-quick-actions" aria-label="Quick actions">
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate("/chits/collections")}>
          Add Collection
        </Button>
        <Button variant="default" icon={<Users size={16} />} onClick={() => navigate("/chits/members")}>
          Add Member
        </Button>
        <Button variant="default" icon={<Trophy size={16} />} onClick={() => navigate("/chits/auctions")}>
          Start Auction
        </Button>
        <Button variant="default" icon={<FileBarChart size={16} />} onClick={() => navigate("/chits/reports")}>
          Generate Report
        </Button>
        <Button variant="success" icon={<MessageCircle size={16} />} onClick={() => navigate("/chits/collections/pending")}>
          Send Pending Reminder
        </Button>
      </div>

      <div className="health-card-grid">
        {CARD_DEFINITIONS.map((definition) => (
          <HealthCard
            key={definition.key}
            definition={definition}
            value={health.stats[definition.key]}
          />
        ))}
      </div>

      <div className="health-chart-grid">
        <ChartCard title="Monthly Collection Trend" subtitle="Collected amount against monthly target">
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={health.charts.monthly_collection_trend} margin={{ left: -18, right: 8 }}>
              <defs>
                <linearGradient id="healthCollectionFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={compactCurrency} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Area type="monotone" dataKey="target" stroke="#d4af37" strokeWidth={2} fill="transparent" />
              <Area type="monotone" dataKey="collected" stroke="#2563eb" strokeWidth={3} fill="url(#healthCollectionFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pending vs Collected" subtitle="Collection exposure split">
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie
                data={health.charts.pending_vs_collected}
                dataKey="value"
                nameKey="name"
                innerRadius={54}
                outerRadius={86}
                paddingAngle={3}
              >
                {health.charts.pending_vs_collected.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
          <ChartLegend data={health.charts.pending_vs_collected} colors={PIE_COLORS} currency />
        </ChartCard>

        <ChartCard title="Chit-wise Performance" subtitle="Group collection strength">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={health.charts.chit_wise_performance} margin={{ left: -18, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={compactCurrency} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="collected" fill="#10b981" radius={[8, 8, 0, 0]} />
              <Bar dataKey="pending" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Payment Mode Split" subtitle="Cash, UPI, bank and cheque mix">
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie
                data={health.charts.payment_mode_split}
                dataKey="value"
                nameKey="name"
                outerRadius={84}
                paddingAngle={4}
              >
                {health.charts.payment_mode_split.map((entry, index) => (
                  <Cell key={entry.name} fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
          <ChartLegend data={health.charts.payment_mode_split} colors={PAYMENT_COLORS} currency />
        </ChartCard>
      </div>
    </section>
  );
}

function HealthCard({ definition, value }) {
  const Icon = definition.icon;
  const tone = getHealthTone(definition.key, value);
  const displayValue = definition.currency
    ? formatCurrency(value)
    : `${Number(value || 0).toLocaleString("en-IN")}${definition.suffix || ""}`;

  return (
    <article className={`health-card health-card-${tone}`}>
      <div className="health-card-icon">
        <Icon size={18} />
      </div>
      <div>
        <span>{definition.label}</span>
        <strong>{displayValue}</strong>
      </div>
      <small>
        {tone === BUSINESS_HEALTH_TONES.GOOD
          ? "Good"
          : tone === BUSINESS_HEALTH_TONES.ATTENTION
            ? "Attention"
            : "Risk"}
      </small>
    </article>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <article className="health-chart-card">
      <div className="health-chart-header">
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      {children}
    </article>
  );
}

function ChartLegend({ data, colors, currency = false }) {
  return (
    <div className="health-chart-legend">
      {data.map((entry, index) => (
        <span key={entry.name}>
          <i style={{ background: colors[index % colors.length] }} />
          {entry.name}: {currency ? formatCurrency(entry.value) : entry.value}
        </span>
      ))}
    </div>
  );
}

function compactCurrency(value) {
  const number = Number(value || 0);
  if (number >= 100000) return `${Math.round(number / 100000)}L`;
  if (number >= 1000) return `${Math.round(number / 1000)}K`;
  return number;
}

export default BusinessHealthDashboard;
