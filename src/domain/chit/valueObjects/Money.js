export class Money {
  constructor(amount = 0, currency = "INR") {
    this.amount = Number(amount || 0);
    this.currency = currency;
  }

  add(value) {
    return new Money(this.amount + toMoneyAmount(value), this.currency);
  }

  subtract(value) {
    return new Money(this.amount - toMoneyAmount(value), this.currency);
  }

  multiply(value) {
    return new Money(this.amount * Number(value || 0), this.currency);
  }

  isNegative() {
    return this.amount < 0;
  }

  toNumber() {
    return this.amount;
  }

  static of(value) {
    return value instanceof Money ? value : new Money(value);
  }
}

export function toMoneyAmount(value) {
  return value instanceof Money ? value.amount : Number(value || 0);
}
