import { DividendEngine } from "../domain/chit/services/DividendEngine.js";
import {
  listDividendsPersistent,
  postDividendBatchPersistent,
} from "./closingLifecyclePersistence.js";

export function previewDividendAllocation(input = {}) {
  return DividendEngine.allocateMonthDividends(input);
}

export async function listDividends(activeTenantContext) {
  return listDividendsPersistent(activeTenantContext);
}

export async function postDividendBatch(input, activeTenantContext) {
  return postDividendBatchPersistent(input, activeTenantContext);
}

export function calculateDividend(discount, commission, totalMembers) {
  return DividendEngine.calculateDividend(discount, commission, totalMembers);
}
