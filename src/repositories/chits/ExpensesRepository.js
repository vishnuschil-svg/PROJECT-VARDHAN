import { ExpenseRepository } from "../ExpenseRepository.js";

export const ExpensesRepository = {
  list({ activeTenantContext, pageSize = Number.MAX_SAFE_INTEGER } = {}) {
    return {
      success: true,
      data: ExpenseRepository.list(activeTenantContext).slice(0, pageSize),
    };
  },
  create(record, { activeTenantContext } = {}) {
    return { success: true, data: ExpenseRepository.save(record, activeTenantContext) };
  },
  update(id, patch, { activeTenantContext } = {}) {
    return {
      success: true,
      data: ExpenseRepository.save({ ...patch, id }, activeTenantContext),
    };
  },
};
