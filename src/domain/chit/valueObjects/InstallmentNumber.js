export class InstallmentNumber {
  constructor(value) {
    this.value = Number(value || 0);
  }

  isValid(totalMonths = Number.MAX_SAFE_INTEGER) {
    return Number.isInteger(this.value) && this.value >= 1 && this.value <= Number(totalMonths || 0);
  }

  isNextAfter(previousInstallment) {
    return this.value === Number(previousInstallment || 0) + 1;
  }

  toNumber() {
    return this.value;
  }
}
