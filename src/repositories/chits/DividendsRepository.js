import { DividendRepository } from "../DividendRepository.js";

export const DividendsRepository = {
  list({ activeTenantContext, pageSize = Number.MAX_SAFE_INTEGER } = {}) {
    return {
      success: true,
      data: DividendRepository.list(activeTenantContext).slice(0, pageSize),
    };
  },
  create(record, { activeTenantContext } = {}) {
    return { success: true, data: DividendRepository.save(record, activeTenantContext) };
  },
  update(id, patch, { activeTenantContext } = {}) {
    return {
      success: true,
      data: DividendRepository.save({ ...patch, id }, activeTenantContext),
    };
  },
};
