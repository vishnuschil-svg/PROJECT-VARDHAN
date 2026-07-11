import test from "node:test";
import assert from "node:assert/strict";
import { FinanceRepository } from "../../repositories/FinanceRepository.js";

class MemoryLocalStorage {
  constructor() {
    this.store = new Map();
  }

  getItem(key) {
    return this.store.get(key) || null;
  }

  setItem(key, value) {
    this.store.set(key, String(value));
  }

  removeItem(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

test("FinanceRepository keeps tenant finance rows isolated", () => {
  global.window = { localStorage: new MemoryLocalStorage() };

  const tenantA = { tenant_id: "tenant-a", data_scope: "scope-a" };
  const tenantB = { tenant_id: "tenant-b", data_scope: "scope-b" };

  FinanceRepository.saveTransaction({ id: "entry-a", type: "income", amount: 100 }, tenantA);
  FinanceRepository.saveTransaction({ id: "entry-b", type: "income", amount: 200 }, tenantB);

  assert.deepEqual(
    FinanceRepository.listTransactions(tenantA).map((entry) => entry.id),
    ["entry-a"]
  );
  assert.deepEqual(
    FinanceRepository.listTransactions(tenantB).map((entry) => entry.id),
    ["entry-b"]
  );

  delete global.window;
});
