/**
 * Logger Module
 * Provides structured logging with tenant context and log levels
 */
export class Logger {
  constructor(options = {}) {
    this.prefix = options.prefix || 'VARDHAN';
    this.level = options.level || 'info';
    this.tenantContext = options.tenantContext || null;
    this.logBuffer = [];
    this.maxBufferSize = options.maxBufferSize || 1000;
  }

  /**
   * Set tenant context
   */
  setTenantContext(tenantContext) {
    this.tenantContext = tenantContext;
  }

  /**
   * Format log entry
   */
  formatLogEntry(level, message, metadata = {}) {
    const safeMetadata = redactSensitive(metadata);
    return {
      timestamp: new Date().toISOString(),
      level,
      prefix: this.prefix,
      tenant_id: this.tenantContext?.tenant_id || null,
      data_scope: this.tenantContext?.data_scope || null,
      message,
      correlation_id: safeMetadata.correlation_id || createCorrelationId(),
      metadata: safeMetadata,
    };
  }

  /**
   * Log to console and buffer
   */
  log(level, message, metadata = {}) {
    const entry = this.formatLogEntry(level, message, metadata);

    // Console output
    const consoleMethod = this.getConsoleMethod(level);
    consoleMethod(`[${entry.timestamp}] [${level.toUpperCase()}] [${entry.prefix}]`, {
      tenant_id: entry.tenant_id,
      data_scope: entry.data_scope,
      message,
      correlation_id: entry.correlation_id,
      ...entry.metadata,
    });

    // Buffer for export
    this.addToBuffer(entry);

    return entry;
  }

  /**
   * Get console method for level
   */
  getConsoleMethod(level) {
    const methods = {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
    };
    return methods[level] || console.log;
  }

  /**
   * Add to buffer
   */
  addToBuffer(entry) {
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  /**
   * Debug level log
   */
  debug(message, metadata = {}) {
    if (this.shouldLog('debug')) {
      return this.log('debug', message, metadata);
    }
  }

  /**
   * Info level log
   */
  info(message, metadata = {}) {
    if (this.shouldLog('info')) {
      return this.log('info', message, metadata);
    }
  }

  /**
   * Warning level log
   */
  warn(message, metadata = {}) {
    if (this.shouldLog('warn')) {
      return this.log('warn', message, metadata);
    }
  }

  /**
   * Error level log
   */
  error(message, metadata = {}) {
    if (this.shouldLog('error')) {
      return this.log('error', message, metadata);
    }
  }

  /**
   * Check if should log at level
   */
  shouldLog(level) {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.level);
    const requestedLevelIndex = levels.indexOf(level);
    return requestedLevelIndex >= currentLevelIndex;
  }

  /**
   * Get log buffer
   */
  getLogs(filter = {}) {
    let logs = [...this.logBuffer];

    if (filter.level) {
      logs = logs.filter(log => log.level === filter.level);
    }

    if (filter.tenant_id) {
      logs = logs.filter(log => log.tenant_id === filter.tenant_id);
    }

    if (filter.since) {
      logs = logs.filter(log => new Date(log.timestamp) >= new Date(filter.since));
    }

    return logs;
  }

  /**
   * Clear log buffer
   */
  clearLogs() {
    this.logBuffer = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(filter = {}) {
    return JSON.stringify(this.getLogs(filter), null, 2);
  }

  /**
   * Get log statistics
   */
  getLogStats() {
    const stats = {
      total: this.logBuffer.length,
      byLevel: {},
      byTenant: {},
    };

    for (const log of this.logBuffer) {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      if (log.tenant_id) {
        stats.byTenant[log.tenant_id] = (stats.byTenant[log.tenant_id] || 0) + 1;
      }
    }

    return stats;
  }
}

const SENSITIVE_KEY = /(aadhaar|account.?number|authorization|cookie|mobile|otp|pass(word|key)?|phone|secret|token)/i;

export function redactSensitive(value, seen = new WeakSet()) {
  if (Array.isArray(value)) return value.map((item) => redactSensitive(item, seen));
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return "[REDACTED:CIRCULAR]";
  seen.add(value);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    SENSITIVE_KEY.test(key) ? "[REDACTED]" : redactSensitive(item, seen),
  ]));
}

function createCorrelationId() {
  return globalThis.crypto?.randomUUID?.() || `corr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Factory function to create logger
 */
export function createLogger(options) {
  return new Logger(options);
}

/**
 * Singleton instance
 */
let loggerInstance = null;

export function getLogger() {
  if (!loggerInstance) {
    loggerInstance = createLogger({ prefix: 'VARDHAN' });
  }
  return loggerInstance;
}

/**
 * Create tenant-scoped logger
 */
export function createTenantLogger(tenantContext) {
  return createLogger({
    prefix: 'VARDHAN',
    tenantContext,
  });
}
