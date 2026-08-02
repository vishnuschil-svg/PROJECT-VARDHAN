import { WinnerRepository } from "../WinnerRepository.js";

export const WinnersRepository = {
  list({ activeTenantContext, pageSize = Number.MAX_SAFE_INTEGER } = {}) {
    return {
      success: true,
      data: WinnerRepository.list(activeTenantContext).slice(0, pageSize),
    };
  },
  create(record, { activeTenantContext } = {}) {
    return { success: true, data: WinnerRepository.save(record, activeTenantContext) };
  },
  update(id, patch, { activeTenantContext } = {}) {
    return {
      success: true,
      data: WinnerRepository.save({ ...patch, id }, activeTenantContext),
    };
  },
};
