/**
 * Health Checker Module
 * Provides health check endpoints for monitoring system status
 */
export class HealthChecker {
  constructor(options = {}) {
    this.checks = new Map();
    this.tenantContext = options.tenantContext || null;
  }

  /**
   * Set tenant context
   */
  setTenantContext(tenantContext) {
    this.tenantContext = tenantContext;
  }

  /**
   * Register a health check
   */
  registerCheck(name, checkFn, options = {}) {
    this.checks.set(name, {
      fn: checkFn,
      critical: options.critical || false,
      timeout: options.timeout || 5000,
      description: options.description || '',
    });
  }

  /**
   * Unregister a health check
   */
  unregisterCheck(name) {
    this.checks.delete(name);
  }

  /**
   * Run a single health check
   */
  async runCheck(name) {
    const check = this.checks.get(name);
    if (!check) {
      return {
        name,
        status: 'unknown',
        message: 'Check not registered',
      };
    }

    try {
      const startTime = Date.now();
      const result = await Promise.race([
        check.fn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Check timeout')), check.timeout)
        ),
      ]);
      const duration = Date.now() - startTime;

      return {
        name,
        status: 'healthy',
        message: check.description || 'Check passed',
        data: result,
        duration,
      };
    } catch (error) {
      return {
        name,
        status: 'unhealthy',
        message: error.message,
        error: error.toString(),
      };
    }
  }

  /**
   * Run all health checks
   */
  async runAllChecks() {
    const results = {};
    const checkNames = Array.from(this.checks.keys());

    for (const name of checkNames) {
      results[name] = await this.runCheck(name);
    }

    return results;
  }

  /**
   * Get overall health status
   */
  async getHealthStatus() {
    const results = await this.runAllChecks();

    const checks = Object.values(results);
    const healthy = checks.filter(c => c.status === 'healthy').length;
    const unhealthy = checks.filter(c => c.status === 'unhealthy').length;
    const criticalUnhealthy = checks.filter(c =>
      c.status === 'unhealthy' && this.checks.get(c.name)?.critical
    ).length;

    let overallStatus = 'healthy';
    if (criticalUnhealthy > 0) {
      overallStatus = 'critical';
    } else if (unhealthy > 0) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      tenant_id: this.tenantContext?.tenant_id || null,
      data_scope: this.tenantContext?.data_scope || null,
      checks: results,
      summary: {
        total: checks.length,
        healthy,
        unhealthy,
        criticalUnhealthy,
      },
    };
  }

  /**
   * Quick health check (critical only)
   */
  async quickHealthCheck() {
    const criticalChecks = Array.from(this.checks.entries())
      .filter(([_, check]) => check.critical)
      .map(([name, _]) => name);

    const results = {};
    for (const name of criticalChecks) {
      results[name] = await this.runCheck(name);
    }

    const healthy = Object.values(results).filter(r => r.status === 'healthy').length;
    const status = healthy === criticalChecks.length ? 'healthy' : 'unhealthy';

    return {
      status,
      timestamp: new Date().toISOString(),
      checks: results,
    };
  }
}

/**
 * Factory function to create health checker
 */
export function createHealthChecker(options) {
  return new HealthChecker(options);
}

/**
 * Singleton instance
 */
let healthCheckerInstance = null;

export function getHealthChecker() {
  if (!healthCheckerInstance) {
    healthCheckerInstance = createHealthChecker();
  }
  return healthCheckerInstance;
}

/**
 * Create tenant-scoped health checker
 */
export function createTenantHealthChecker(tenantContext) {
  return createHealthChecker({ tenantContext });
}

/**
 * Common health checks
 */
export const CommonHealthChecks = {
  /**
   * Database connectivity check
   */
  async databaseCheck(checkConnection) {
    return runConfiguredCheck("Database", checkConnection);
  },

  /**
   * Supabase connectivity check
   */
  async supabaseCheck(checkConnection) {
    return runConfiguredCheck("Supabase", checkConnection);
  },

  /**
   * Storage connectivity check
   */
  async storageCheck(checkConnection) {
    return runConfiguredCheck("Storage", checkConnection);
  },

  /**
   * Memory usage check
   */
  async memoryCheck() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(usage.external / 1024 / 1024)}MB`,
      };
    }
    return { status: 'not available' };
  },

  /**
   * Disk space check
   */
  async diskCheck(checkDisk) {
    return runConfiguredCheck("Disk", checkDisk);
  },
};

async function runConfiguredCheck(name, check) {
  if (typeof check !== "function") {
    throw new Error(`${name} health check is not configured`);
  }
  const startedAt = Date.now();
  const data = await check();
  if (data === false || data?.connected === false || data?.healthy === false) {
    throw new Error(`${name} health check failed`);
  }
  return { connected: true, latency: Date.now() - startedAt, details: data ?? null };
}
