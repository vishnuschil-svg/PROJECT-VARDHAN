import { ChitCompletionRepository } from "../ChitCompletionRepository.js";

export const CompletionsRepository = {
  list({ activeTenantContext, pageSize = Number.MAX_SAFE_INTEGER } = {}) {
    return {
      success: true,
      data: ChitCompletionRepository.list(activeTenantContext).slice(0, pageSize),
    };
  },
  create(record, { activeTenantContext } = {}) {
    return { success: true, data: ChitCompletionRepository.save(record, activeTenantContext) };
  },
  update(id, patch, { activeTenantContext } = {}) {
    return {
      success: true,
      data: ChitCompletionRepository.save({ ...patch, id }, activeTenantContext),
    };
  },
};
