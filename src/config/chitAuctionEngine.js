import { MEMBER_STATUS } from "./chitMemberData";

export const AUCTION_TYPES = {
  MANUAL: "manual",
  LUCKY_DRAW: "lucky_draw",
};

export const AUCTION_STATUS = {
  SCHEDULED: "scheduled",
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

export const AUCTION_DRAW_DURATION_MS = 12000;

export function getEligibleAuctionMembers({ members = [], groupId, auctionHistory = [] }) {
  const previousWinnerIds = new Set(
    auctionHistory
      .filter((auction) => auction.chit_group_id === groupId && auction.status === AUCTION_STATUS.COMPLETED)
      .map((auction) => auction.winner_id)
      .filter(Boolean)
  );

  return members.filter(
    (member) =>
      member.status === MEMBER_STATUS.ACTIVE &&
      member.chit_group_id === groupId &&
      !previousWinnerIds.has(member.id)
  );
}

export function calculateAuctionFinancials({
  group,
  bidAmount = 0,
  eligibleCount = 0,
}) {
  const chitValue = Number(group?.chit_value || 0);
  const monthlyAmount = Number(group?.monthly_amount || 0);
  const totalMembers = Number(group?.total_members || eligibleCount || 1);
  const bid = Number(bidAmount || 0);
  const discount = Math.max(chitValue - bid, 0);
  const foremanCommission = Math.round(chitValue * 0.05);
  const remainingDistribution = Math.max(discount - foremanCommission, 0);
  const dividend = totalMembers ? Math.floor(remainingDistribution / totalMembers) : 0;
  const winnerPayable = Math.max(bid - foremanCommission, 0);

  return {
    chit_value: chitValue,
    monthly_amount: monthlyAmount,
    bid_amount: bid,
    discount,
    foreman_commission: foremanCommission,
    dividend,
    winner_payable: winnerPayable,
    remaining_distribution: remainingDistribution,
  };
}

export function selectAuctionLuckyWinner(eligibleMembers = []) {
  if (!eligibleMembers.length) return null;

  const randomValue = getSecureRandomValue();
  const winnerIndex = Math.floor(randomValue * eligibleMembers.length);

  return {
    winner: eligibleMembers[winnerIndex],
    winnerIndex,
    randomValue,
    algorithm: "crypto.getRandomValues uniform random index",
  };
}

export function createAuctionRecord({
  formData,
  group,
  winner,
  activeTenantContext,
  eligibleCount,
  status = AUCTION_STATUS.COMPLETED,
  randomValue = null,
  winnerIndex = null,
}) {
  const financials = calculateAuctionFinancials({
    group,
    bidAmount: formData.bid_amount,
    eligibleCount,
  });
  const timestamp = new Date().toISOString();

  return {
    id: `auction-${Date.now()}`,
    tenant_id: activeTenantContext?.tenant_id || "",
    data_scope: activeTenantContext?.data_scope || "",
    workspace_label: activeTenantContext?.workspace_label || "",
    chit_group_id: formData.chit_group_id,
    chit_group_name: group?.chit_name || "Chit Group",
    auction_date: formData.auction_date,
    auction_month: formData.auction_month,
    auction_type: formData.auction_type,
    starting_bid: Number(formData.starting_bid || 0),
    minimum_bid: Number(formData.minimum_bid || 0),
    bid_amount: financials.bid_amount,
    base_amount: financials.chit_value,
    discount: financials.discount,
    dividend: financials.dividend,
    winner_payable: financials.winner_payable,
    remaining_distribution: financials.remaining_distribution,
    foreman_commission: financials.foreman_commission,
    winner_id: winner?.id || "",
    winner_name: winner?.member_name || "",
    winner_number: winner?.member_number || "",
    eligible_count: eligibleCount,
    random_value: randomValue === null ? "" : randomValue.toFixed(10),
    winner_index: winnerIndex ?? "",
    status,
    notes: formData.notes || "",
    created_at: timestamp,
  };
}

export function createAuctionAuditLog(auction, action = "auction_completed") {
  return {
    id: `auction-audit-${auction.id}-${action}`,
    auction_id: auction.id,
    action,
    actor: "System",
    tenant_id: auction.tenant_id,
    data_scope: auction.data_scope,
    summary: `${auction.winner_name || "No winner"} selected for ${auction.chit_group_name} (${auction.auction_type})`,
    created_at: new Date().toISOString(),
  };
}

export function getAuctionDashboardStats(auctions = [], eligibleMembers = []) {
  const today = new Date().toISOString().slice(0, 10);
  const completed = auctions.filter((auction) => auction.status === AUCTION_STATUS.COMPLETED);
  const activeOrScheduled = auctions.filter((auction) => auction.status !== AUCTION_STATUS.COMPLETED);

  return {
    todays_auctions: auctions.filter((auction) => auction.auction_date === today).length,
    upcoming_auctions: activeOrScheduled.filter((auction) => auction.auction_date >= today).length,
    completed_auctions: completed.length,
    current_dividend: completed[0]?.dividend || 0,
    current_lowest_bid: completed.length
      ? Math.min(...completed.map((auction) => Number(auction.bid_amount || 0)))
      : 0,
    eligible_members: eligibleMembers.length,
  };
}

export function buildAuctionReports(auctions = []) {
  const completed = auctions.filter((auction) => auction.status === AUCTION_STATUS.COMPLETED);
  const monthlyTotals = completed.reduce((acc, auction) => {
    const month = auction.auction_date?.slice(0, 7) || auction.auction_month;
    acc[month] = acc[month] || {
      month,
      auctions: 0,
      total_bid: 0,
      total_dividend: 0,
      total_discount: 0,
    };
    acc[month].auctions += 1;
    acc[month].total_bid += Number(auction.bid_amount || 0);
    acc[month].total_dividend += Number(auction.dividend || 0);
    acc[month].total_discount += Number(auction.discount || 0);
    return acc;
  }, {});

  return {
    monthly: Object.values(monthlyTotals),
    winners: completed.map((auction) => ({
      id: auction.id,
      winner_name: auction.winner_name,
      winner_number: auction.winner_number,
      chit_group_name: auction.chit_group_name,
      auction_date: auction.auction_date,
      bid_amount: auction.bid_amount,
      winner_payable: auction.winner_payable,
    })),
    dividends: completed.map((auction) => ({
      id: auction.id,
      chit_group_name: auction.chit_group_name,
      auction_month: auction.auction_month,
      dividend: auction.dividend,
      remaining_distribution: auction.remaining_distribution,
    })),
  };
}

function getSecureRandomValue() {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    return values[0] / 2 ** 32;
  }

  return Math.random();
}
