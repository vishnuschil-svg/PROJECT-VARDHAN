import { createMigrationAdapter } from "./MigrationAdapter.js";

/**
 * Rollback Strategy Manager
 * Handles safe rollback operations for failed migrations
 */
export class RollbackStrategy {
  constructor(options = {}) {
    this.tenantContext = options.tenantContext;
    this.rollbackLog = [];
    this.snapshotBeforeMigration = null;
  }

  /**
   * Create snapshot before migration
   */
  async createSnapshot(repositoryTypes = []) {
    const defaultTypes = [
      "chit_groups",
      "chit_members",
      "chit_collections",
      "chit_receipts",
      "chit_auctions",
      "workspaces",
      "notifications",
    ];

    const typesToSnapshot = repositoryTypes.length > 0 ? repositoryTypes : defaultTypes;
    const snapshot = {
      timestamp: new Date().toISOString(),
      tenantContext: this.tenantContext,
      repositories: {},
    };

    for (const repoType of typesToSnapshot) {
      try {
        const adapter = createMigrationAdapter({
          repositoryType: repoType,
          tenantContext: this.tenantContext,
        });

        const supabaseData = await adapter.supabaseRepo.getAll({
          activeTenantContext: this.tenantContext,
        });

        const localData = adapter.readLocalStorage();

        snapshot.repositories[repoType] = {
          supabaseCount: (supabaseData.data || []).length,
          localCount: localData.length,
          supabaseData: supabaseData.data || [],
          localData: localData,
        };
      } catch (error) {
        snapshot.repositories[repoType] = {
          error: error.message,
          status: "failed",
        };
      }
    }

    this.snapshotBeforeMigration = snapshot;
    return snapshot;
  }

  /**
   * Execute migration with automatic rollback on failure
   */
  async executeWithRollback(migrationConfig) {
    const { repositoryTypes, strategy = "supabase_wins", dryRun = false } = migrationConfig;

    // Create snapshot before migration
    const snapshot = await this.createSnapshot(repositoryTypes);

    const migrationResults = {
      timestamp: new Date().toISOString(),
      snapshot: snapshot,
      migrations: {},
      rollbackExecuted: false,
      rollbackSuccess: false,
    };

    try {
      // Execute migrations
      for (const repoType of repositoryTypes) {
        try {
          const adapter = createMigrationAdapter({
            repositoryType: repoType,
            tenantContext: this.tenantContext,
          });

          const result = await adapter.migrate({ strategy, dryRun });
          migrationResults.migrations[repoType] = result;

          // If any migration fails, trigger rollback
          if (result.status === "error" && !dryRun) {
            throw new Error(`Migration failed for ${repoType}: ${result.message}`);
          }
        } catch (error) {
          migrationResults.migrations[repoType] = {
            status: "error",
            message: error.message,
            error,
          };

          if (!dryRun) {
            console.error(`Migration failed for ${repoType}, initiating rollback...`);
            const rollbackResult = await this.executeRollback(repositoryTypes);
            migrationResults.rollbackExecuted = true;
            migrationResults.rollbackSuccess = rollbackResult.success;
            throw error;
          }
        }
      }

      return migrationResults;
    } catch (error) {
      migrationResults.overallError = error.message;
      return migrationResults;
    }
  }

  /**
   * Execute rollback for failed migration
   */
  async executeRollback(repositoryTypes = []) {
    const rollbackResults = {
      timestamp: new Date().toISOString(),
      operations: [],
      success: true,
    };

    if (!this.snapshotBeforeMigration) {
      rollbackResults.success = false;
      rollbackResults.error = "No snapshot available for rollback";
      return rollbackResults;
    }

    for (const repoType of repositoryTypes) {
      try {
        const adapter = createMigrationAdapter({
          repositoryType: repoType,
          tenantContext: this.tenantContext,
        });

        const repoSnapshot = this.snapshotBeforeMigration.repositories[repoType];

        if (!repoSnapshot || repoSnapshot.error) {
          rollbackResults.operations.push({
            repository: repoType,
            status: "skipped",
            reason: "No valid snapshot available",
          });
          continue;
        }

        // Rollback to snapshot state
        const result = await this.rollbackToSnapshot(adapter, repoSnapshot);
        rollbackResults.operations.push({
          repository: repoType,
          status: result.status,
          message: result.message,
        });

        if (result.status === "error") {
          rollbackResults.success = false;
        }
      } catch (error) {
        rollbackResults.operations.push({
          repository: repoType,
          status: "error",
          error: error.message,
        });
        rollbackResults.success = false;
      }
    }

    this.rollbackLog.push(rollbackResults);
    return rollbackResults;
  }

  /**
   * Rollback specific repository to snapshot state
   */
  async rollbackToSnapshot(adapter, snapshot) {
    try {
      // Delete all records that were added during migration
      const currentData = await adapter.supabaseRepo.getAll({
        activeTenantContext: this.tenantContext,
      });

      if (currentData.error) {
        return { status: "error", message: currentData.message };
      }

      const currentIds = new Set((currentData.data || []).map(r => r.id));
      const snapshotIds = new Set(snapshot.supabaseData.map(r => r.id));

      // Records to delete (in current but not in snapshot)
      const toDelete = (currentData.data || []).filter(r => !snapshotIds.has(r.id));

      for (const record of toDelete) {
        const deleteResult = await adapter.supabaseRepo.delete(record.id, {
          activeTenantContext: this.tenantContext,
        });

        if (deleteResult.error) {
          return { status: "error", message: `Failed to delete record ${record.id}` };
        }
      }

      // Restore records that were in snapshot but not in current
      const toRestore = snapshot.supabaseData.filter(r => !currentIds.has(r.id));

      for (const record of toRestore) {
        const createResult = await adapter.supabaseRepo.create(record, {
          activeTenantContext: this.tenantContext,
        });

        if (createResult.error) {
          return { status: "error", message: `Failed to restore record ${record.id}` };
        }
      }

      return { status: "success", message: "Rollback completed successfully" };
    } catch (error) {
      return { status: "error", message: error.message };
    }
  }

  /**
   * Manual rollback to specific point in time
   */
  async rollbackToPointInTime(targetTimestamp) {
    if (!this.snapshotBeforeMigration) {
      return {
        success: false,
        error: "No snapshot available for point-in-time rollback",
      };
    }

    const snapshotTime = new Date(this.snapshotBeforeMigration.timestamp);
    const targetTime = new Date(targetTimestamp);

    if (targetTime >= snapshotTime) {
      return {
        success: false,
        error: "Target timestamp must be before snapshot time",
      };
    }

    // For now, we only support rolling back to the snapshot
    // In a full implementation, this would query Supabase point-in-time recovery
    return await this.executeRollback(Object.keys(this.snapshotBeforeMigration.repositories));
  }

  /**
   * Get rollback history
   */
  getRollbackHistory() {
    return this.rollbackLog;
  }

  /**
   * Validate rollback safety
   */
  async validateRollbackSafety(repositoryTypes = []) {
    const validation = {
      safe: true,
      warnings: [],
      errors: [],
    };

    if (!this.snapshotBeforeMigration) {
      validation.safe = false;
      validation.errors.push("No snapshot available for rollback validation");
      return validation;
    }

    for (const repoType of repositoryTypes) {
      const adapter = createMigrationAdapter({
        repositoryType: repoType,
        tenantContext: this.tenantContext,
      });

      const currentData = await adapter.supabaseRepo.getAll({
        activeTenantContext: this.tenantContext,
      });

      if (currentData.error) {
        validation.errors.push(`Cannot access ${repoType}: ${currentData.message}`);
        validation.safe = false;
        continue;
      }

      const repoSnapshot = this.snapshotBeforeMigration.repositories[repoType];
      const currentCount = (currentData.data || []).length;
      const snapshotCount = repoSnapshot?.supabaseCount || 0;

      // Warn if data has grown significantly since snapshot
      if (currentCount > snapshotCount * 2) {
        validation.warnings.push(
          `${repoType}: Current count (${currentCount}) is significantly higher than snapshot (${snapshotCount})`
        );
      }

      // Check for data integrity
      const currentIds = new Set((currentData.data || []).map(r => r.id));
      const snapshotIds = new Set(repoSnapshot?.supabaseData?.map(r => r.id) || []);

      const missingInCurrent = [...snapshotIds].filter(id => !currentIds.has(id));
      if (missingInCurrent.length > 0) {
        validation.warnings.push(
          `${repoType}: ${missingInCurrent.length} records from snapshot are missing in current data`
        );
      }
    }

    return validation;
  }

  /**
   * Export rollback plan
   */
  exportRollbackPlan() {
    if (!this.snapshotBeforeMigration) {
      return { error: "No snapshot available" };
    }

    const plan = {
      snapshot: this.snapshotBeforeMigration,
      rollbackSteps: [],
      estimatedImpact: {},
    };

    for (const [repoType, snapshot] of Object.entries(this.snapshotBeforeMigration.repositories)) {
      if (snapshot.error) continue;

      plan.rollbackSteps.push({
        repository: repoType,
        action: "restore_to_snapshot",
        recordCount: snapshot.supabaseCount,
      });

      plan.estimatedImpact[repoType] = {
        recordsAffected: snapshot.supabaseCount,
        estimatedDuration: Math.ceil(snapshot.supabaseCount / 100) + " seconds",
      };
    }

    return plan;
  }

  /**
   * Clear snapshot (call after successful migration)
   */
  clearSnapshot() {
    this.snapshotBeforeMigration = null;
  }
}

/**
 * Factory function to create rollback strategy
 */
export function createRollbackStrategy(tenantContext) {
  return new RollbackStrategy({ tenantContext });
}

/**
 * Safe migration executor with automatic rollback
 */
export async function safeMigration(migrationConfig) {
  const rollbackStrategy = createRollbackStrategy(migrationConfig.tenantContext);

  try {
    const result = await rollbackStrategy.executeWithRollback(migrationConfig);

    if (result.overallError) {
      console.error("Migration failed, rollback executed:", result.rollbackSuccess);
      return {
        success: false,
        message: result.overallError,
        rollbackExecuted: result.rollbackExecuted,
        rollbackSuccess: result.rollbackSuccess,
        details: result,
      };
    }

    // Migration successful, clear snapshot
    rollbackStrategy.clearSnapshot();

    return {
      success: true,
      message: "Migration completed successfully",
      details: result,
    };
  } catch (error) {
    console.error("Migration error:", error);
    return {
      success: false,
      message: error.message,
      error,
    };
  }
}
