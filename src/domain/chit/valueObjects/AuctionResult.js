export class AuctionResult {
  constructor({ prizeAmount = 0, discount = 0, dividend = 0, commission = 0 } = {}) {
    this.prizeAmount = Number(prizeAmount || 0);
    this.discount = Number(discount || 0);
    this.dividend = Number(dividend || 0);
    this.commission = Number(commission || 0);
  }

  toJSON() {
    return {
      prizeAmount: this.prizeAmount,
      discount: this.discount,
      dividend: this.dividend,
      commission: this.commission,
    };
  }
}
