import test from "node:test";
import assert from "node:assert/strict";
import { formatFinanceCurrency } from "../../services/financeService.js";

test("finance service formats dashboard currency consistently", () => {
  assert.equal(formatFinanceCurrency(125000).includes("1,25,000"), true);
  assert.equal(formatFinanceCurrency(0).endsWith("0"), true);
});
