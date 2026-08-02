import { LuckyDrawRepository } from "../LuckyDrawRepository.js";

export const LuckyDrawsRepository = {
  list({ activeTenantContext, pageSize = Number.MAX_SAFE_INTEGER } = {}) {
    return {
      success: true,
      data: LuckyDrawRepository.list(activeTenantContext).slice(0, pageSize),
    };
  },
  create(record, { activeTenantContext } = {}) {
    return { success: true, data: LuckyDrawRepository.save(record, activeTenantContext) };
  },
  update(id, patch, { activeTenantContext } = {}) {
    return {
      success: true,
      data: LuckyDrawRepository.save({ ...patch, id }, activeTenantContext),
    };
  },
};
