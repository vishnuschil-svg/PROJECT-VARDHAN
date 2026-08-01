import { createMigrationAdapter } from "./MigrationAdapter.js";

/**
 * Data Reconciliation Engine
 * Compares localStorage and Supabase data to identify conflicts and discrepancies
 */
export class DataReconciliation {
  constructor(options = {}) {
    this.tenantContext = options.tenantContext;
    this.reconciliationReport = null;
  }

  /**
   * Perform full reconciliation across all repositories
   */
  async reconcile(repositoryTypes = []) {
    const defaultTypes = [
      "chit_groups",
      "chit_members",
      "chit_collections",
      "chit_receipts",
      "chit_auctions",
      "workspaces",
      "notifications",
      "support_tickets",
      "communication_templates",
      "chit_schedule_rows",
    ];

    const typesToReconcile = repositoryTypes.length > 0 ? repositoryTypes : defaultTypes;
    const results = {};

    for (const repoType of typesToReconcile) {
      try {
        results[repoType] = await this.reconcileRepository(repoType);
      } catch (error) {
        results[repoType] = {
          status: "error",
          message: error.message,
          error,
        };
      }
    }

    this.reconciliationReport = {
      timestamp: new Date().toISOString(),
      tenantContext: this.tenantContext,
      results,
      summary: this.generateSummary(results),
    };

    return this.reconciliationReport;
  }

  /**
   * Reconcile a single repository
   */
  async reconcileRepository(repositoryType) {
    const adapter = createMigrationAdapter({
      repositoryType,
      tenantContext: this.tenantContext,
    });

    const localData = adapter.readLocalStorage();
    const supabaseData = await adapter.supabaseRepo.getAll({
      activeTenantContext: this.tenantContext,
    });

    if (supabaseData.error) {
      return {
        status: "error",
        message: supabaseData.message,
        error: supabaseData.error,
      };
    }

    const comparison = this.compareDatasets(localData, supabaseData.data || []);
    const conflicts = this.identifyConflicts(localData, supabaseData.data || []);
    const recommendations = this.generateRecommendations(comparison, conflicts);

    return {
      status: "success",
      repositoryType,
      comparison,
      conflicts,
      recommendations,
      localCount: localData.length,
      supabaseCount: (supabaseData.data || []).length,
    };
  }

  /**
   * Compare local and Supabase datasets
   */
  compareDatasets(localData, supabaseData) {
    const localIds = new Set(localData.map(r => this.getRecordId(r)));
    const supabaseIds = new Set(supabaseData.map(r => r.id));

    const onlyInLocal = localData.filter(r => !supabaseIds.has(this.getRecordId(r)));
    const onlyInSupabase = supabaseData.filter(r => !localIds.has(r.id));
    const inBoth = localData.filter(r => supabaseIds.has(this.getRecordId(r)));

    return {
      onlyInLocal: onlyInLocal.length,
      onlyInSupabase: onlyInSupabase.length,
      inBoth: inBoth.length,
      onlyInLocalRecords: onlyInLocal,
      onlyInSupabaseRecords: onlyInSupabase,
      commonRecords: inBoth,
    };
  }

  /**
   * Identify conflicts between local and Supabase records
   */
  identifyConflicts(localData, supabaseData) {
    const conflicts = [];
    const localMap = new Map(localData.map(r => [this.getRecordId(r), r]));

    for (const supabaseRecord of supabaseData) {
      const localRecord = localMap.get(supabaseRecord.id);
      if (!localRecord) continue;

      const conflict = this.detectRecordConflict(localRecord, supabaseRecord);
      if (conflict) {
        conflicts.push({
          recordId: supabaseRecord.id,
          localRecord,
          supabaseRecord,
          conflictType: conflict.type,
          conflictDetails: conflict.details,
          resolution: this.suggestResolution(localRecord, supabaseRecord, conflict),
        });
      }
    }

    return conflicts;
  }

  /**
   * Detect conflict between two records
   */
  detectRecordConflict(localRecord, supabaseRecord) {
    const localUpdatedAt = new Date(localRecord.updated_at || localRecord.updatedAt || 0);
    const supabaseUpdatedAt = new Date(supabaseRecord.updated_at || 0);
    const timeDiff = Math.abs(localUpdatedAt - supabaseUpdatedAt);

    // Consider records conflicting if they were modified within 1 minute of each other
    // and have different data
    if (timeDiff < 60000 && !this.recordsAreEqual(localRecord, supabaseRecord)) {
      return {
        type: "concurrent_modification",
        details: {
          localUpdatedAt: localUpdatedAt.toISOString(),
          supabaseUpdatedAt: supabaseUpdatedAt.toISOString(),
          timeDifference: timeDiff,
        },
      };
    }

    // Check for data inconsistencies
    const dataDifferences = this.findDataDifferences(localRecord, supabaseRecord);
    if (dataDifferences.length > 0) {
      return {
        type: "data_divergence",
        details: {
          differences: dataDifferences,
        },
      };
    }

    return null;
  }

  /**
   * Check if two records are functionally equal
   */
  recordsAreEqual(localRecord, supabaseRecord) {
    const ignoreFields = ["tenant_id", "data_scope", "created_at", "updated_at", "id"];

    const localKeys = Object.keys(localRecord).filter(k => !ignoreFields.includes(k));
    const supabaseKeys = Object.keys(supabaseRecord).filter(k => !ignoreFields.includes(k));

    if (localKeys.length !== supabaseKeys.length) return false;

    for (const key of localKeys) {
      if (!supabaseKeys.includes(key)) return false;
      if (JSON.stringify(localRecord[key]) !== JSON.stringify(supabaseRecord[key])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Find data differences between records
   */
  findDataDifferences(localRecord, supabaseRecord) {
    const differences = [];
    const ignoreFields = ["tenant_id", "data_scope", "created_at", "updated_at", "id"];

    const allKeys = new Set([
      ...Object.keys(localRecord),
      ...Object.keys(supabaseRecord),
    ]);

    for (const key of allKeys) {
      if (ignoreFields.includes(key)) continue;

      const localValue = localRecord[key];
      const supabaseValue = supabaseRecord[key];

      if (JSON.stringify(localValue) !== JSON.stringify(supabaseValue)) {
        differences.push({
          field: key,
          localValue,
          supabaseValue,
        });
      }
    }

    return differences;
  }

  /**
   * Suggest resolution for conflict
   */
  suggestResolution(localRecord, supabaseRecord, conflict) {
    const localUpdatedAt = new Date(localRecord.updated_at || localRecord.updatedAt || 0);
    const supabaseUpdatedAt = new Date(supabaseRecord.updated_at || 0);

    if (conflict.type === "concurrent_modification") {
      if (localUpdatedAt > supabaseUpdatedAt) {
        return {
          strategy: "local_wins",
          reason: "Local record is more recent",
          confidence: "high",
        };
      } else {
        return {
          strategy: "supabase_wins",
          reason: "Supabase record is more recent",
          confidence: "high",
        };
      }
    }

    if (conflict.type === "data_divergence") {
      const diffCount = conflict.details.differences.length;
      if (diffCount <= 2) {
        return {
          strategy: "merge",
          reason: "Minor data differences can be merged",
          confidence: "medium",
        };
      } else {
        return {
          strategy: "manual_review",
          reason: "Significant data differences require manual review",
          confidence: "high",
        };
      }
    }

    return {
      strategy: "supabase_wins",
      reason: "Default to Supabase as source of truth",
      confidence: "low",
    };
  }

  /**
   * Generate migration recommendations
   */
  generateRecommendations(comparison, conflicts) {
    const recommendations = [];

    if (comparison.onlyInLocal > 0) {
      recommendations.push({
        action: "migrate_to_supabase",
        count: comparison.onlyInLocal,
        priority: "high",
        reason: `${comparison.onlyInLocal} records exist only in localStorage`,
      });
    }

    if (comparison.onlyInSupabase > 0) {
      recommendations.push({
        action: "review_orphaned",
        count: comparison.onlyInSupabase,
        priority: "medium",
        reason: `${comparison.onlyInSupabase} records exist only in Supabase`,
      });
    }

    if (conflicts.length > 0) {
      const autoResolvable = conflicts.filter(c => c.resolution.confidence === "high").length;
      const manualReview = conflicts.filter(c => c.resolution.strategy === "manual_review").length;

      if (autoResolvable > 0) {
        recommendations.push({
          action: "auto_resolve_conflicts",
          count: autoResolvable,
          priority: "high",
          reason: `${autoResolvable} conflicts can be automatically resolved`,
        });
      }

      if (manualReview > 0) {
        recommendations.push({
          action: "manual_conflict_review",
          count: manualReview,
          priority: "critical",
          reason: `${manualReview} conflicts require manual review`,
        });
      }
    }

    if (recommendations.length === 0) {
      recommendations.push({
        action: "no_action",
        priority: "low",
        reason: "Data is synchronized",
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Generate summary report
   */
  generateSummary(results) {
    const totalRepositories = Object.keys(results).length;
    const successfulReconciliations = Object.values(results).filter(r => r.status === "success").length;
    const totalConflicts = Object.values(results).reduce((sum, r) => sum + (r.conflicts?.length || 0), 0);
    const totalOnlyInLocal = Object.values(results).reduce((sum, r) => sum + (r.comparison?.onlyInLocal || 0), 0);
    const totalOnlyInSupabase = Object.values(results).reduce((sum, r) => sum + (r.comparison?.onlyInSupabase || 0), 0);

    return {
      totalRepositories,
      successfulReconciliations,
      failedReconciliations: totalRepositories - successfulReconciliations,
      totalConflicts,
      totalOnlyInLocal,
      totalOnlyInSupabase,
      overallStatus: totalConflicts === 0 && totalOnlyInLocal === 0 ? "synchronized" : "attention_required",
    };
  }

  /**
   * Get record ID for comparison
   */
  getRecordId(record) {
    return record.id || record.localId || record._id || JSON.stringify(record);
  }

  /**
   * Export reconciliation report
   */
  exportReport(format = "json") {
    if (!this.reconciliationReport) {
      throw new Error("No reconciliation report available. Run reconcile() first.");
    }

    if (format === "json") {
      return JSON.stringify(this.reconciliationReport, null, 2);
    }

    if (format === "summary") {
      return this.formatSummaryReport();
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * Format human-readable summary report
   */
  formatSummaryReport() {
    const report = this.reconciliationReport;
    const summary = report.summary;

    let text = `Data Reconciliation Report\n`;
    text += `Generated: ${report.timestamp}\n`;
    text += `Tenant: ${report.tenantContext?.tenant_id || "N/A"}\n`;
    text += `Scope: ${report.tenantContext?.data_scope || "N/A"}\n\n`;

    text += `Summary:\n`;
    text += `- Total Repositories: ${summary.totalRepositories}\n`;
    text += `- Successful: ${summary.successfulReconciliations}\n`;
    text += `- Failed: ${summary.failedReconciliations}\n`;
    text += `- Total Conflicts: ${summary.totalConflicts}\n`;
    text += `- Records Only in Local: ${summary.totalOnlyInLocal}\n`;
    text += `- Records Only in Supabase: ${summary.totalOnlyInSupabase}\n`;
    text += `- Overall Status: ${summary.overallStatus}\n\n`;

    text += `Repository Details:\n`;
    for (const [repoType, result] of Object.entries(report.results)) {
      if (result.status === "error") {
        text += `- ${repoType}: ERROR - ${result.message}\n`;
        continue;
      }

      text += `- ${repoType}:\n`;
      text += `  Local: ${result.localCount}, Supabase: ${result.supabaseCount}\n`;
      text += `  Only in Local: ${result.comparison.onlyInLocal}\n`;
      text += `  Only in Supabase: ${result.comparison.onlyInSupabase}\n`;
      text += `  Conflicts: ${result.conflicts.length}\n`;

      if (result.recommendations.length > 0) {
        text += `  Recommendations:\n`;
        for (const rec of result.recommendations) {
          text += `    - ${rec.action} (${rec.priority}): ${rec.reason}\n`;
        }
      }
      text += `\n`;
    }

    return text;
  }
}

/**
 * Factory function to create reconciliation engine
 */
export function createReconciliationEngine(tenantContext) {
  return new DataReconciliation({ tenantContext });
}
