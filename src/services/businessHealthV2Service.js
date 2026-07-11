import { BusinessHealthV2Engine } from "../domain/chit/services/BusinessHealthV2Engine.js";
import { ChitLifecycleRepository } from "../repositories/ChitLifecycleRepository.js";
import { ExpenseRepository } from "../repositories/ExpenseRepository.js";
import { InvestorRepository } from "../repositories/InvestorRepository.js";
import { PayoutRepository } from "../repositories/PayoutRepository.js";
import { runTrialReconciliation } from "./reconciliationService.js";

export function getBusinessHealthV2(activeTenantContext) {
  const source = ChitLifecycleRepository.getLifecycleSource(activeTenantContext);
  return BusinessHealthV2Engine.calculate({
    ...source,
    expenses: ExpenseRepository.list(activeTenantContext),
    investorTransactions: InvestorRepository.listTransactions(activeTenantContext),
    payouts: PayoutRepository.list(activeTenantContext),
    reconciliation: runTrialReconciliation(source),
  });
}
