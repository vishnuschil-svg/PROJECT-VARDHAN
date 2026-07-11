export class ReceiptNumber {
  constructor(value) {
    this.value = String(value || "").trim();
  }

  isValid() {
    return /^[A-Z0-9-]{6,}$/.test(this.value);
  }

  toString() {
    return this.value;
  }
}
