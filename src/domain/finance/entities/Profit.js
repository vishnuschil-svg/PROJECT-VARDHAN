export class Profit {
  constructor(record = {}) {
    this.id = record.id || "profit";
    this.period = record.period || "";
    this.income = Number(record.income || 0);
    this.expense = Number(record.expense || 0);
    this.commission = Number(record.commission || 0);
    this.pendingCollection = Number(record.pendingCollection || 0);
    this.netProfit = Number(record.netProfit || 0);
  }
}
