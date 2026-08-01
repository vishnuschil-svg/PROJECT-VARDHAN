import { SupabaseRepository } from "./SupabaseRepository.js";
import { getTenantScope, requireTenantScope } from "./SupabaseRepository.js";

/**
 * Migration Adapter for localStorage to Supabase
 * Handles data migration with conflict resolution and rollback support
 */
export class MigrationAdapter {
  constructor(options = {}) {
    this.supabaseRepo = options.supabaseRepo || new SupabaseRepository(options);
    this.localStorageKey = options.localStorageKey;
    this.tenantContext = options.tenantContext;
    this.migrationLog = [];
    this.rollbackStack = [];
  }

  /**
   * Migrate data from localStorage to Supabase
   */
  async migrate(options = {}) {
    const { strategy = "supabase_wins", dryRun = false } = options;

    try {
      const localData = this.readLocalStorage();
      if (!localData || localData.length === 0) {
        return this.createResult("success", "No local data to migrate", []);
      }

      const scope = requireTenantScope(this.tenantContext);
      const migrationResults = [];

      for (const record of localData) {
        const result = await this.migrateRecord(record, scope, { strategy, dryRun });
        migrationResults.push(result);

        if (!dryRun && result.status === "success") {
          this.rollbackStack.push({
            action: "create",
            record: result.supabaseRecord,
            localId: record.id || record.localId,
          });
        }
      }

      return this.createResult(
        "success",
        `Migrated ${migrationResults.filter(r => r.status === "success").length} of ${migrationResults.length} records`,
        migrationResults
      );
    } catch (error) {
      return this.createResult("error", error.message, null, error);
    }
  }

  /**
   * Migrate a single record with conflict resolution
   */
  async migrateRecord(localRecord, scope, options = {}) {
    const { strategy = "supabase_wins", dryRun = false } = options;

    try {
      // Check if record exists in Supabase
      const existingResult = await this.findExistingRecord(localRecord, scope);

      if (existingResult.data) {
        // Record exists - apply conflict resolution strategy
        return await this.resolveConflict(localRecord, existingResult.data, strategy, dryRun);
      } else {
        // New record - insert to Supabase
        if (dryRun) {
          return this.createResult("dry_run", "Would insert new record", localRecord);
        }

        const normalizedRecord = this.normalizeForSupabase(localRecord, scope);
        const insertResult = await this.supabaseRepo.create(normalizedRecord, {
          activeTenantContext: this.tenantContext,
        });

        if (insertResult.error) {
          return this.createResult("error", insertResult.message, null, insertResult.error);
        }

        return this.createResult("success", "Record migrated", insertResult.data, null, localRecord);
      }
    } catch (error) {
      return this.createResult("error", error.message, null, error);
    }
  }

  /**
   * Find existing record in Supabase by local identifier
   */
  async findExistingRecord(localRecord, scope) {
    const identifier = this.getRecordIdentifier(localRecord);

    if (!identifier) {
      return { data: null };
    }

    return await this.supabaseRepo.getAll({
      filters: identifier,
      activeTenantContext: this.tenantContext,
    });
  }

  /**
   * Resolve conflicts between local and Supabase records
   */
  async resolveConflict(localRecord, supabaseRecord, strategy, dryRun) {
    if (strategy === "supabase_wins") {
      return this.createResult("skipped", "Supabase record wins - local ignored", supabaseRecord);
    }

    if (strategy === "local_wins") {
      if (dryRun) {
        return this.createResult("dry_run", "Would update Supabase with local data", localRecord);
      }

      const normalizedRecord = this.normalizeForSupabase(localRecord, requireTenantScope(this.tenantContext));
      const updateResult = await this.supabaseRepo.update(supabaseRecord.id, normalizedRecord, {
        activeTenantContext: this.tenantContext,
      });

      if (updateResult.error) {
        return this.createResult("error", updateResult.message, null, updateResult.error);
      }

      this.rollbackStack.push({
        action: "update",
        previousRecord: supabaseRecord,
        recordId: supabaseRecord.id,
      });

      return this.createResult("success", "Supabase record updated with local data", updateResult.data, null, localRecord);
    }

    if (strategy === "merge") {
      const mergedRecord = this.mergeRecords(localRecord, supabaseRecord);

      if (dryRun) {
        return this.createResult("dry_run", "Would merge records", mergedRecord);
      }

      const updateResult = await this.supabaseRepo.update(supabaseRecord.id, mergedRecord, {
        activeTenantContext: this.tenantContext,
      });

      if (updateResult.error) {
        return this.createResult("error", updateResult.message, null, updateResult.error);
      }

      this.rollbackStack.push({
        action: "update",
        previousRecord: supabaseRecord,
        recordId: supabaseRecord.id,
      });

      return this.createResult("success", "Records merged", updateResult.data, null, localRecord);
    }

    return this.createResult("skipped", "Unknown conflict strategy", supabaseRecord);
  }

  /**
   * Merge local and Supabase records
   */
  mergeRecords(localRecord, supabaseRecord) {
    // Local record wins on updated_at comparison
    const localUpdatedAt = new Date(localRecord.updated_at || localRecord.updatedAt || 0);
    const supabaseUpdatedAt = new Date(supabaseRecord.updated_at || 0);

    if (localUpdatedAt > supabaseUpdatedAt) {
      return { ...supabaseRecord, ...this.normalizeForSupabase(localRecord) };
    }

    return supabaseRecord;
  }

  /**
   * Normalize localStorage record for Supabase
   */
  normalizeForSupabase(localRecord, scope) {
    const normalized = {
      ...localRecord,
      tenant_id: scope.tenant_id,
      data_scope: scope.data_scope,
    };

    // Remove local-specific fields
    delete normalized.localId;
    delete normalized._localTimestamp;

    // Convert date strings to ISO format
    if (localRecord.created_at && !localRecord.created_at.includes('T')) {
      normalized.created_at = new Date(localRecord.created_at).toISOString();
    }
    if (localRecord.updated_at && !localRecord.updated_at.includes('T')) {
      normalized.updated_at = new Date(localRecord.updated_at).toISOString();
    }

    return normalized;
  }

  /**
   * Get record identifier for conflict detection
   */
  getRecordIdentifier(record) {
    // Try common identifier fields
    if (record.id) return { id: record.id };
    if (record.external_ref) return { external_ref: record.external_ref };
    if (record.member_number) return { member_number: record.member_number };
    if (record.receipt_no) return { receipt_no: record.receipt_no };
    if (record.chit_code) return { chit_code: record.chit_code };

    return null;
  }

  /**
   * Read data from localStorage
   */
  readLocalStorage() {
    if (!this.localStorageKey || typeof window === "undefined") {
      return [];
    }

    try {
      const data = window.localStorage.getItem(this.localStorageKey);
      if (!data) return [];

      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      console.error(`Error reading localStorage key ${this.localStorageKey}:`, error);
      return [];
    }
  }

  /**
   * Rollback migration
   */
  async rollback() {
    const rollbackResults = [];

    // Process rollback stack in reverse order
    for (let i = this.rollbackStack.length - 1; i >= 0; i--) {
      const operation = this.rollbackStack[i];

      try {
        if (operation.action === "create") {
          const result = await this.supabaseRepo.delete(operation.record.id, {
            activeTenantContext: this.tenantContext,
          });
          rollbackResults.push({ action: "delete", status: result.error ? "error" : "success", error: result.error });
        } else if (operation.action === "update") {
          const result = await this.supabaseRepo.update(operation.recordId, operation.previousRecord, {
            activeTenantContext: this.tenantContext,
          });
          rollbackResults.push({ action: "restore", status: result.error ? "error" : "success", error: result.error });
        }
      } catch (error) {
        rollbackResults.push({ action: operation.action, status: "error", error });
      }
    }

    this.rollbackStack = [];

    const successCount = rollbackResults.filter(r => r.status === "success").length;
    return this.createResult(
      successCount === rollbackResults.length ? "success" : "partial",
      `Rolled back ${successCount} of ${rollbackResults.length} operations`,
      rollbackResults
    );
  }

  /**
   * Get migration status
   */
  getStatus() {
    return {
      canRollback: this.rollbackStack.length > 0,
      rollbackOperations: this.rollbackStack.length,
      migrationLog: this.migrationLog,
    };
  }

  /**
   * Create standardized result object
   */
  createResult(status, message, data, error = null, localRecord = null) {
    const result = {
      status,
      message,
      data,
      error,
      timestamp: new Date().toISOString(),
    };

    if (localRecord) {
      result.localRecord = localRecord;
    }

    this.migrationLog.push(result);
    return result;
  }
}

/**
 * Factory function to create migration adapters for specific repositories
 */
export function createMigrationAdapter(config) {
  const adapterConfigs = {
    chit_groups: {
      localStorageKey: "vardhan.chit.groups.v1",
      tableName: "chit_groups",
      primaryKey: "id",
      searchableFields: ["chit_name", "chit_code"],
    },
    chit_members: {
      localStorageKey: "vardhan.chit.members.v1",
      tableName: "chit_members",
      primaryKey: "id",
      searchableFields: ["member_name", "member_number"],
    },
    chit_collections: {
      localStorageKey: "vardhan.chit.collections.v1",
      tableName: "chit_collections",
      primaryKey: "id",
      searchableFields: ["receipt_no"],
    },
    chit_receipts: {
      localStorageKey: "vardhan.chit.receipts.v1",
      tableName: "chit_receipts",
      primaryKey: "id",
      searchableFields: ["receipt_no"],
    },
    chit_auctions: {
      localStorageKey: "vardhan.chit.auctions.v1",
      tableName: "chit_auctions",
      primaryKey: "id",
      searchableFields: [],
    },
    workspaces: {
      localStorageKey: "vardhan.workspace.active.v1",
      tableName: "workspaces",
      primaryKey: "id",
      searchableFields: ["business_name"],
    },
    notifications: {
      localStorageKey: "vardhan.notifications.v1",
      tableName: "notifications",
      primaryKey: "id",
      searchableFields: ["title"],
    },
    support_tickets: {
      localStorageKey: "vardhan.support.tickets.v1",
      tableName: "support_tickets",
      primaryKey: "id",
      searchableFields: ["subject"],
    },
    communication_templates: {
      localStorageKey: "vardhan.communication.templates.v1",
      tableName: "communication_templates",
      primaryKey: "id",
      searchableFields: ["template_name"],
    },
    chit_schedule_rows: {
      localStorageKey: "vardhan.chit.schedule.rows.v1",
      tableName: "chit_schedule_rows",
      primaryKey: "id",
      searchableFields: [],
    },
  };

  const adapterConfig = adapterConfigs[config.repositoryType];
  if (!adapterConfig) {
    throw new Error(`Unknown repository type: ${config.repositoryType}`);
  }

  const supabaseRepo = new SupabaseRepository({
    tableName: adapterConfig.tableName,
    primaryKey: adapterConfig.primaryKey,
    searchableFields: adapterConfig.searchableFields,
  });

  return new MigrationAdapter({
    supabaseRepo,
    localStorageKey: adapterConfig.localStorageKey,
    tenantContext: config.tenantContext,
  });
}

/**
 * Batch migration for multiple repositories
 */
export async function batchMigration(configs) {
  const results = {};

  for (const config of configs) {
    try {
      const adapter = createMigrationAdapter(config);
      results[config.repositoryType] = await adapter.migrate(config.options || {});
    } catch (error) {
      results[config.repositoryType] = {
        status: "error",
        message: error.message,
        error,
      };
    }
  }

  return results;
}
