import { MonthClosingRepository as LocalMonthClosingRepository } from "../MonthClosingRepository.js";

export const MonthClosingRepository = {
  list({ activeTenantContext, pageSize = Number.MAX_SAFE_INTEGER } = {}) {
    return {
      success: true,
      data: LocalMonthClosingRepository.list(activeTenantContext).slice(0, pageSize),
    };
  },
  create(record, { activeTenantContext } = {}) {
    return { success: true, data: LocalMonthClosingRepository.save(record, activeTenantContext) };
  },
  update(id, patch, { activeTenantContext } = {}) {
    return {
      success: true,
      data: LocalMonthClosingRepository.save({ ...patch, id }, activeTenantContext),
    };
  },
};
