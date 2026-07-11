const OFFLINE_QUEUE_KEY = "vardhan.data.offlineQueue.v1";

export const OfflineQueueService = {
  enqueue(operation) {
    const nextOperation = {
      ...operation,
      id: operation.id || `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: "queued",
      createdAt: operation.createdAt || new Date().toISOString(),
      attempts: Number(operation.attempts || 0),
    };
    const queue = this.list();
    writeQueue([nextOperation, ...queue]);
    return createQueueResponse(nextOperation, "Operation queued for sync.");
  },

  list() {
    return readQueue();
  },

  clearCompleted() {
    const pending = this.list().filter((operation) => operation.status !== "completed");
    writeQueue(pending);
    return createQueueResponse(pending, "Completed operations cleared.");
  },

  markCompleted(operationId) {
    const queue = this.list().map((operation) =>
      operation.id === operationId
        ? { ...operation, status: "completed", completedAt: new Date().toISOString() }
        : operation
    );
    writeQueue(queue);
    return createQueueResponse(queue.find((operation) => operation.id === operationId), "Operation completed.");
  },

  markFailed(operationId, error) {
    const queue = this.list().map((operation) =>
      operation.id === operationId
        ? {
            ...operation,
            status: "failed",
            attempts: Number(operation.attempts || 0) + 1,
            error,
            updatedAt: new Date().toISOString(),
          }
        : operation
    );
    writeQueue(queue);
    return createQueueResponse(queue.find((operation) => operation.id === operationId), "Operation failed.");
  },
};

function createQueueResponse(data, message) {
  return {
    success: true,
    data,
    error: null,
    message,
  };
}

function readQueue() {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  }
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}
