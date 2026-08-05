/**
 * Metrics Collector Module
 * Collects and aggregates application metrics for monitoring
 */
export class MetricsCollector {
  constructor(options = {}) {
    this.tenantContext = options.tenantContext || null;
    this.metrics = {
      counters: {},
      gauges: {},
      histograms: {},
      timers: {},
    };
    this.startTime = Date.now();
  }

  /**
   * Set tenant context
   */
  setTenantContext(tenantContext) {
    this.tenantContext = tenantContext;
  }

  /**
   * Increment a counter
   */
  incrementCounter(name, value = 1, tags = {}) {
    const key = this.getMetricKey(name, tags);
    this.metrics.counters[key] = (this.metrics.counters[key] || 0) + value;
  }

  /**
   * Decrement a counter
   */
  decrementCounter(name, value = 1, tags = {}) {
    const key = this.getMetricKey(name, tags);
    this.metrics.counters[key] = (this.metrics.counters[key] || 0) - value;
  }

  /**
   * Set a gauge value
   */
  setGauge(name, value, tags = {}) {
    const key = this.getMetricKey(name, tags);
    this.metrics.gauges[key] = value;
  }

  /**
   * Increment a gauge
   */
  incrementGauge(name, value = 1, tags = {}) {
    const key = this.getMetricKey(name, tags);
    this.metrics.gauges[key] = (this.metrics.gauges[key] || 0) + value;
  }

  /**
   * Decrement a gauge
   */
  decrementGauge(name, value = 1, tags = {}) {
    const key = this.getMetricKey(name, tags);
    this.metrics.gauges[key] = (this.metrics.gauges[key] || 0) - value;
  }

  /**
   * Record a histogram value
   */
  recordHistogram(name, value, tags = {}) {
    const key = this.getMetricKey(name, tags);
    if (!this.metrics.histograms[key]) {
      this.metrics.histograms[key] = [];
    }
    this.metrics.histograms[key].push(value);
  }

  /**
   * Start a timer
   */
  startTimer(name, tags = {}) {
    const key = this.getMetricKey(name, tags);
    this.metrics.timers[key] = Date.now();
  }

  /**
   * Stop a timer and record duration
   */
  stopTimer(name, tags = {}) {
    const key = this.getMetricKey(name, tags);
    if (this.metrics.timers[key]) {
      const duration = Date.now() - this.metrics.timers[key];
      this.recordHistogram(`${name}_duration`, duration, tags);
      delete this.metrics.timers[key];
      return duration;
    }
    return null;
  }

  /**
   * Time a function execution
   */
  async timeFunction(name, fn, tags = {}) {
    this.startTimer(name, tags);
    try {
      const result = await fn();
      this.incrementCounter(`${name}_success`, 1, tags);
      return result;
    } catch (error) {
      this.incrementCounter(`${name}_error`, 1, tags);
      throw error;
    } finally {
      this.stopTimer(name, tags);
    }
  }

  /**
   * Get metric key with tags
   */
  getMetricKey(name, tags) {
    const tagString = Object.entries(tags)
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return tagString ? `${name}{${tagString}}` : name;
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    return {
      counters: { ...this.metrics.counters },
      gauges: { ...this.metrics.gauges },
      histograms: { ...this.metrics.histograms },
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Get metrics by type
   */
  getMetricsByType(type) {
    return { ...this.metrics[type] };
  }

  /**
   * Get histogram statistics
   */
  getHistogramStats(name, tags = {}) {
    const key = this.getMetricKey(name, tags);
    const values = this.metrics.histograms[key] || [];

    if (values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      sum,
      mean: sum / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p90: sorted[Math.floor(sorted.length * 0.9)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      counters: {},
      gauges: {},
      histograms: {},
      timers: {},
    };
    this.startTime = Date.now();
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics() {
    return JSON.stringify(this.getMetrics(), null, 2);
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics() {
    let output = '';

    // Counters
    for (const [key, value] of Object.entries(this.metrics.counters)) {
      const name = key.split('{')[0];
      const tags = this.parseTags(key);
      const tagString = this.formatTags(tags);
      output += `${name}${tagString} ${value}\n`;
    }

    // Gauges
    for (const [key, value] of Object.entries(this.metrics.gauges)) {
      const name = key.split('{')[0];
      const tags = this.parseTags(key);
      const tagString = this.formatTags(tags);
      output += `${name}${tagString} ${value}\n`;
    }

    // Histograms
    for (const [key] of Object.entries(this.metrics.histograms)) {
      const name = key.split('{')[0];
      const tags = this.parseTags(key);
      const tagString = this.formatTags(tags);
      const stats = this.getHistogramStats(name, tags);

      if (stats) {
        output += `${name}_count${tagString} ${stats.count}\n`;
        output += `${name}_sum${tagString} ${stats.sum}\n`;
        output += `${name}_bucket${tagString} {le="0.5"} ${stats.p50}\n`;
        output += `${name}_bucket${tagString} {le="0.9"} ${stats.p90}\n`;
        output += `${name}_bucket${tagString} {le="0.95"} ${stats.p95}\n`;
        output += `${name}_bucket${tagString} {le="0.99"} ${stats.p99}\n`;
        output += `${name}_bucket${tagString} {le="+Inf"} ${stats.max}\n`;
      }
    }

    return output;
  }

  /**
   * Parse tags from metric key
   */
  parseTags(key) {
    const match = key.match(/\{(.+)\}/);
    if (!match) return {};

    const tagString = match[1];
    const tags = {};

    for (const pair of tagString.split(',')) {
      const [key, value] = pair.split('=');
      tags[key] = value;
    }

    return tags;
  }

  /**
   * Format tags for Prometheus
   */
  formatTags(tags) {
    if (Object.keys(tags).length === 0) return '';

    const tagString = Object.entries(tags)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `{${tagString}}`;
  }
}

/**
 * Factory function to create metrics collector
 */
export function createMetricsCollector(options) {
  return new MetricsCollector(options);
}

/**
 * Singleton instance
 */
let metricsCollectorInstance = null;

export function getMetricsCollector() {
  if (!metricsCollectorInstance) {
    metricsCollectorInstance = createMetricsCollector();
  }
  return metricsCollectorInstance;
}

/**
 * Create tenant-scoped metrics collector
 */
export function createTenantMetricsCollector(tenantContext) {
  return createMetricsCollector({ tenantContext });
}
