import { DividendEngine } from "../domain/chit/services/DividendEngine.js";
import {
  listDividendsPersistent,
  postDividendBatchPersistent,
} from "./closingLifecyclePersistence.js";
import { assertRegisteredOperationEnabled } from "../config/groupManagerSafety.js";

export function previewDividendAllocation(input = {}) {
  assertRegisteredOperationEnabled("AUTOMATED_AUCTION");
  return DividendEngine.allocateMonthDividends(input);
}

export async function listDividends(activeTenantContext) {
  return listDividendsPersistent(activeTenantContext);
}

export async function postDividendBatch(input, activeTenantContext) {
  assertRegisteredOperationEnabled("AUTOMATED_AUCTION");
  return postDividendBatchPersistent(input, activeTenantContext);
}

export function calculateDividend(discount, commission, totalMembers) {
  return DividendEngine.calculateDividend(discount, commission, totalMembers);
}
