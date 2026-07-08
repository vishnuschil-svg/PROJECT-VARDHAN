import { MEMBER_STATUS } from "./chitMemberData";
import { CHIT_GROUP_STATUS } from "./chitPhaseOneData";

export const BUSINESS_HEALTH_TONES = {
  GOOD: "good",
  ATTENTION: "attention",
  RISK: "risk",
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

export function buildBusinessHealthDashboard({ groups = [], members = [] }) {
  const activeGroups = groups.filter((group) => group.status === CHIT_GROUP_STATUS.ACTIVE);
  const activeMembers = members.filter((member) => member.status === MEMBER_STATUS.ACTIVE);
  const monthlyCollections = activeGroups.reduce(
    (sum, group) => sum + Number(group.monthly_amount || 0) * Number(group.total_members || 0),
    0
  );
  const todaysCollections = groups.reduce(
    (sum, group) => sum + Number(group.today_collections || 0),
    0
  );
  const pendingCollections = groups.reduce(
    (sum, group) => sum + Number(group.pending_collections || 0),
    0
  );
  const overdueAmount = Math.round(pendingCollections * 0.42);
  const collectedAmount = Math.max(monthlyCollections - pendingCollections, 0);
  const collectionPercentage = monthlyCollections
    ? Math.round((collectedAmount / monthlyCollections) * 100)
    : 0;
  const today = new Date().toISOString().slice(0, 10);
  const todaysAuctions = groups.filter((group) => group.next_auction_date === today).length;
  const upcomingAuctions = groups.filter(
    (group) =>
      group.next_auction_date &&
      group.next_auction_date >= today &&
      group.status !== CHIT_GROUP_STATUS.CLOSED &&
      group.status !== CHIT_GROUP_STATUS.ARCHIVED
  ).length;
  const liftedMembers = Math.min(
    activeMembers.length,
    activeGroups.reduce((sum, group) => {
      const startMonth = new Date(group.start_date).getMonth();
      return sum + Math.max(new Date().getMonth() - startMonth, 0);
    }, 0)
  );
  const nonLiftedMembers = Math.max(activeMembers.length - liftedMembers, 0);
  const cashInHand = Math.round(todaysCollections * 0.38 + pendingCollections * 0.08);
  const bankBalance = Math.round(monthlyCollections * 0.58 + todaysCollections * 0.62);
  const monthlyProfit = Math.round(monthlyCollections * 0.075 - overdueAmount * 0.018);
  const highRiskMembers = activeMembers.filter((member, index) => {
    const group = groups.find((item) => item.id === member.chit_group_id);
    const groupPendingRatio = group?.monthly_amount
      ? Number(group.pending_collections || 0) / Math.max(Number(group.monthly_amount), 1)
      : 0;
    return groupPendingRatio > 2 || !member.whatsapp_number || index % 7 === 0;
  }).length;

  return {
    stats: {
      total_active_chits: activeGroups.length,
      total_members: activeMembers.length,
      todays_collections: todaysCollections,
      monthly_collections: monthlyCollections,
      pending_collections: pendingCollections,
      overdue_amount: overdueAmount,
      collection_percentage: collectionPercentage,
      todays_auctions: todaysAuctions,
      upcoming_auctions: upcomingAuctions,
      lifted_members: liftedMembers,
      non_lifted_members: nonLiftedMembers,
      cash_in_hand: cashInHand,
      bank_balance: bankBalance,
      monthly_profit: monthlyProfit,
      high_risk_members: highRiskMembers,
    },
    charts: {
      monthly_collection_trend: buildMonthlyTrend(monthlyCollections, pendingCollections),
      pending_vs_collected: [
        { name: "Collected", value: collectedAmount },
        { name: "Pending", value: pendingCollections },
        { name: "Overdue", value: overdueAmount },
      ],
      chit_wise_performance: groups.map((group) => {
        const expected = Number(group.monthly_amount || 0) * Number(group.total_members || 0);
        const pending = Number(group.pending_collections || 0);
        const collected = Math.max(expected - pending, 0);
        return {
          name: group.chit_code || group.chit_name,
          collected,
          pending,
          performance: expected ? Math.round((collected / expected) * 100) : 0,
        };
      }),
      payment_mode_split: buildPaymentModeSplit(todaysCollections, monthlyCollections),
    },
  };
}

export function getHealthTone(metric, value) {
  if (metric === "collection_percentage") {
    if (value >= 85) return BUSINESS_HEALTH_TONES.GOOD;
    if (value >= 65) return BUSINESS_HEALTH_TONES.ATTENTION;
    return BUSINESS_HEALTH_TONES.RISK;
  }

  if (["pending_collections", "overdue_amount", "high_risk_members"].includes(metric)) {
    if (value <= 0) return BUSINESS_HEALTH_TONES.GOOD;
    if (value <= 50000 || metric === "high_risk_members" && value <= 2) {
      return BUSINESS_HEALTH_TONES.ATTENTION;
    }
    return BUSINESS_HEALTH_TONES.RISK;
  }

  if (["cash_in_hand", "bank_balance", "monthly_profit", "todays_collections"].includes(metric)) {
    return value > 0 ? BUSINESS_HEALTH_TONES.GOOD : BUSINESS_HEALTH_TONES.ATTENTION;
  }

  return BUSINESS_HEALTH_TONES.GOOD;
}

function buildMonthlyTrend(monthlyCollections, pendingCollections) {
  const baseCollected = Math.max(monthlyCollections - pendingCollections, 0);

  return MONTH_LABELS.map((month, index) => {
    const factor = 0.72 + index * 0.055;
    const collected = Math.round(baseCollected * factor);
    return {
      month,
      collected,
      target: Math.round(monthlyCollections * (0.78 + index * 0.035)),
    };
  });
}

function buildPaymentModeSplit(todaysCollections, monthlyCollections) {
  const base = Math.max(todaysCollections || monthlyCollections * 0.12, 1);

  return [
    { name: "Cash", value: Math.round(base * 0.34) },
    { name: "UPI", value: Math.round(base * 0.28) },
    { name: "Bank", value: Math.round(base * 0.26) },
    { name: "Cheque", value: Math.round(base * 0.12) },
  ];
}
