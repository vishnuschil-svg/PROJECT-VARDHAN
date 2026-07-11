import { OfflineQueueService } from "./OfflineQueueService.js";

export const DataSyncService = {
  async syncRepository(repository, { activeTenantContext, pageSize = 100, filters = {} } = {}) {
    const response = await repository.getAll({
      activeTenantContext,
      pageSize,
      filters,
    });

    return {
      ...response,
      syncedAt: response.success ? new Date().toISOString() : null,
      cacheReady: true,
      realtimeReady: typeof repository.subscribe === "function",
    };
  },

  async flushOfflineQueue(repositoryMap = {}, activeTenantContext) {
    const operations = OfflineQueueService.list().filter((operation) => operation.status === "queued");
    const results = [];

    for (const operation of operations) {
      const repository = repositoryMap[operation.repository];

      if (!repository || typeof repository[operation.action] !== "function") {
        OfflineQueueService.markFailed(operation.id, "Repository action unavailable.");
        results.push({ operationId: operation.id, success: false });
        continue;
      }

      const response = await executeQueuedOperation(repository, operation, activeTenantContext);

      if (response.success) {
        OfflineQueueService.markCompleted(operation.id);
      } else {
        OfflineQueueService.markFailed(operation.id, response.error || response.message);
      }

      results.push({ operationId: operation.id, ...response });
    }

    return {
      success: results.every((result) => result.success),
      data: results,
      error: null,
      message: "Offline queue flush completed.",
    };
  },

  subscribeRepository(repository, options = {}) {
    if (!repository || typeof repository.subscribe !== "function") {
      return {
        success: false,
        data: null,
        error: { message: "Repository does not support realtime subscriptions." },
        message: "Realtime unavailable.",
      };
    }

    return repository.subscribe(options);
  },
};

async function executeQueuedOperation(repository, operation, activeTenantContext) {
  const options = { activeTenantContext };

  if (operation.action === "create") {
    return repository.create(operation.payload, options);
  }

  if (operation.action === "update") {
    return repository.update(operation.recordId, operation.payload, options);
  }

  if (operation.action === "delete") {
    return repository.delete(operation.recordId, options);
  }

  return {
    success: false,
    data: null,
    error: { message: "Unsupported offline action." },
    message: "Unsupported offline action.",
  };
}
