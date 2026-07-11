import { Commission } from "../entities/Commission.js";

export const CommissionEngine = {
  buildCommissionRegister({ auctions = [], rate = 5 } = {}) {
    return auctions.map((auction) => {
      const amount = Math.round((Number(auction.bid_amount || auction.lift_amount || 0) * Number(rate || 0)) / 100);
      return new Commission({
        id: `commission-${auction.id}`,
        source_id: auction.id,
        date: auction.auction_date || auction.created_at,
        amount,
        rate,
        status: "Calculated",
      });
    });
  },
};
