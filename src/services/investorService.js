import { Investor } from "../domain/chit/entities/Investor.js";
import { InvestorRepository } from "../repositories/InvestorRepository.js";

export function saveInvestor(input, activeTenantContext) {
  return InvestorRepository.save(new Investor(input).toJSON(), activeTenantContext);
}

export function addInvestorTransaction(input, activeTenantContext) {
  return InvestorRepository.saveTransaction({
    ...input,
    amount: Number(input.amount || 0),
    date: input.date || new Date().toISOString().slice(0, 10),
    createdAt: input.createdAt || new Date().toISOString(),
  }, activeTenantContext);
}

export function getInvestorLedger(activeTenantContext) {
  const investors = InvestorRepository.list(activeTenantContext);
  const transactions = InvestorRepository.listTransactions(activeTenantContext);
  return investors.map((investor) => {
    const rows = transactions.filter((row) => row.investorId === investor.id || row.investor_id === investor.id);
    const balance = rows.reduce((total, row) => total + signedAmount(row), 0);
    return { investor, transactions: rows, balance };
  });
}

function signedAmount(row) {
  const type = row.transactionType || row.transaction_type;
  const amount = Number(row.amount || 0);
  return ["REPAYMENT", "WITHDRAWAL", "PROFIT_SHARE"].includes(type) ? -amount : amount;
}
