import { BusinessHealthRepository } from "../repositories/BusinessHealthRepository.js";
import { BusinessHealthEngine } from "../domain/chit/services/BusinessHealthEngine.js";

const ICON_KEYS = {
  ACTIVE_CHITS: "activeChits",
  MEMBERS: "members",
  TODAY_COLLECTION: "todayCollection",
  MONTHLY_COLLECTION: "monthlyCollection",
  PENDING: "pending",
  PROFIT: "profit",
};

export function getBusinessHealth(activeTenantContext) {
  const snapshot = BusinessHealthRepository.getSnapshot(activeTenantContext);
  const health = BusinessHealthEngine.buildHealth(snapshot);

  return {
    score: health.score,
    status: health.status,
    collectionRate: health.collectionRate,
    pendingRate: health.pendingRate,
    cashFlow: health.cashFlow,
    profitTrend: health.profitTrend,
    aiSuggestion: health.aiSuggestion,
  };
}

export function getBusinessHealthDashboardModel(activeTenantContext) {
  const snapshot = BusinessHealthRepository.getSnapshot(activeTenantContext);
  const health = BusinessHealthEngine.buildHealth(snapshot);
  const metrics = health.metrics;

  return {
    health: {
      score: health.score,
      status: health.status,
      collectionRate: health.collectionRate,
      pendingRate: health.pendingRate,
      cashFlow: health.cashFlow,
      profitTrend: health.profitTrend,
      aiSuggestion: health.aiSuggestion,
    },
    kpis: [
      {
        label: "Active Chits",
        value: metrics.activeGroups.toLocaleString("en-IN"),
        helper: "Live groups",
        iconKey: ICON_KEYS.ACTIVE_CHITS,
        tone: "good",
      },
      {
        label: "Members",
        value: metrics.activeMembers.toLocaleString("en-IN"),
        helper: "Active members",
        iconKey: ICON_KEYS.MEMBERS,
        tone: "neutral",
      },
      {
        label: "Today Collection",
        value: formatCurrency(metrics.todayCollection),
        helper: "Collected today",
        iconKey: ICON_KEYS.TODAY_COLLECTION,
        tone: "good",
      },
      {
        label: "Monthly Collection",
        value: formatCurrency(metrics.monthlyCollection),
        helper: "Current cycle",
        iconKey: ICON_KEYS.MONTHLY_COLLECTION,
        tone: "neutral",
      },
      {
        label: "Pending",
        value: formatCurrency(metrics.pendingAmount),
        helper: "Needs follow-up",
        iconKey: ICON_KEYS.PENDING,
        tone: "warning",
      },
      {
        label: "Profit",
        value: formatCurrency(metrics.profitTrend),
        helper: "Monthly trend",
        iconKey: ICON_KEYS.PROFIT,
        tone: "profit",
      },
    ],
    signals: [
      {
        label: "Collection rate",
        value: `${metrics.collectionRate}%`,
        icon: "trend",
      },
      {
        label: "Cash flow",
        value: formatCurrency(metrics.cashFlow),
        icon: "shield",
      },
      {
        label: "Pending rate",
        value: `${metrics.pendingRate}%`,
        icon: "shield",
      },
    ],
  };
}

export { ICON_KEYS as BUSINESS_HEALTH_ICON_KEYS };

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}
