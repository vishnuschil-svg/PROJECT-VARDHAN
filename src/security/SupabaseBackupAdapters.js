const DEFAULT_DATASETS = Object.freeze({
  groups: "chit_groups",
  members: "chit_members",
  collections: "chit_collections",
  receipts: "chit_receipts",
  auctions: "chit_auctions",
  ledger: "chit_ledger_entries",
  schedules: "chit_schedule_rows",
  payouts: "chit_payouts",
  dividends: "chit_dividends",
  rules: "chit_rules",
});

export function createSupabaseBackupAdapters(supabase, datasets = DEFAULT_DATASETS) {
  if (!supabase?.from) throw new Error("A configured Supabase client is required for production backup adapters.");
  return Object.fromEntries(Object.entries(datasets).map(([name, table]) => [name, createScopedTableAdapter(supabase, table)]));
}

export function createSupabaseRestoreAuditAdapter(supabase) {
  if (!supabase?.from) throw new Error("A configured Supabase client is required for restore auditing.");
  return Object.freeze({
    async list(context) {
      const scope = normalizeScope(context);
      const { data, error } = await supabase.from("restore_audit_logs").select("*")
        .eq("tenant_id", scope.tenantId).eq("data_scope", scope.dataScope).order("created_at");
      if (error) throw new Error(`Restore audit read failed: ${error.message}`);
      return data || [];
    },
    async append(entry, context) {
      const scope = normalizeScope(context);
      assertScopedRows([entry], scope);
      const row = {
        tenant_id: scope.tenantId,
        data_scope: scope.dataScope,
        workspace_id: entry.workspaceId || entry.workspace_id,
        backup_id: entry.backupId || entry.backup_id || null,
        owner_id: entry.ownerId,
        action: entry.action,
        previous_hash: entry.previousHash,
        hash: entry.hash,
        metadata: entry,
        created_at: entry.occurredAt,
      };
      if (!row.workspace_id) throw new Error("Workspace is required for restore audit records.");
      const { error } = await supabase.from("restore_audit_logs").insert(row);
      if (error) throw new Error(`Restore audit append failed: ${error.message}`);
    },
  });
}

function createScopedTableAdapter(supabase, table) {
  if (!/^[a-z][a-z0-9_]*$/.test(table)) throw new Error(`Unsafe backup table name: ${table}`);
  return Object.freeze({
    async exportTenant(context) {
      const scope = normalizeScope(context);
      const { data, error } = await supabase.from(table).select("*")
        .eq("tenant_id", scope.tenantId).eq("data_scope", scope.dataScope);
      if (error) throw new Error(`${table} backup export failed: ${error.message}`);
      assertScopedRows(data || [], scope);
      return data || [];
    },
    async snapshot(context) { return this.exportTenant(context); },
    async restoreTenant(rows, context, options = {}) {
      const scope = normalizeScope(context);
      if (!["confirmed-replace", "rollback"].includes(options.mode)) throw new Error("Restore adapter requires a confirmed restore or rollback mode.");
      if (!Array.isArray(rows)) throw new Error(`${table} restore rows must be an array.`);
      assertScopedRows(rows, scope);
      const deletion = await supabase.from(table).delete().eq("tenant_id", scope.tenantId).eq("data_scope", scope.dataScope);
      if (deletion.error) throw new Error(`${table} restore cleanup failed: ${deletion.error.message}`);
      if (!rows.length) return { restored: 0 };
      const scopedRows = rows.map((row) => ({ ...row, tenant_id: scope.tenantId, data_scope: scope.dataScope }));
      const insertion = await supabase.from(table).insert(scopedRows);
      if (insertion.error) throw new Error(`${table} restore insert failed: ${insertion.error.message}`);
      return { restored: scopedRows.length };
    },
  });
}

function normalizeScope(context = {}) {
  const tenantId = String(context.tenant_id || context.tenantId || "").trim();
  const dataScope = String(context.data_scope || context.dataScope || "").trim();
  if (!tenantId || !dataScope) throw new Error("Tenant and data scope are required.");
  return { tenantId, dataScope };
}

function assertScopedRows(rows, scope) {
  rows.forEach((row) => {
    const tenantId = row.tenant_id || row.tenantId || scope.tenantId;
    const dataScope = row.data_scope || row.dataScope || scope.dataScope;
    if (tenantId !== scope.tenantId || dataScope !== scope.dataScope) throw new Error("Cross-tenant backup or restore data was rejected.");
  });
}

export { DEFAULT_DATASETS as PRODUCTION_BACKUP_DATASETS };
