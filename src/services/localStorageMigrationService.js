export const MIGRATION_ORDER = Object.freeze(["groups", "members", "collections", "receipts", "ledger", "finance", "auctions", "payouts"]);

export class LocalStorageMigrationEngine {
  constructor({ sources, destinations, auditStore, backupStore, now = () => new Date().toISOString() }) {
    this.sources = sources;
    this.destinations = destinations;
    this.auditStore = auditStore;
    this.backupStore = backupStore;
    this.now = now;
  }

  preview(context) {
    const records = this.readSource(context);
    return { order: [...MIGRATION_ORDER], counts: counts(records), totals: totals(records), validation: validate(records, context) };
  }

  async run(context, { dryRun = false, migrationId = `migration-${Date.now()}`, resume = true } = {}) {
    const records = this.readSource(context);
    const validation = validate(records, context);
    if (validation.errors.length) throw new Error(validation.errors.join(" "));
    const backup = { migrationId, createdAt: this.now(), context, records };
    await this.backupStore.save(backup);
    if (dryRun) return { migrationId, dryRun: true, preview: this.preview(context), created: [] };

    const prior = resume ? await this.auditStore.get(migrationId) : null;
    const created = [...(prior?.created || [])];
    const completed = new Set(prior?.completed || []);
    try {
      for (const name of MIGRATION_ORDER) {
        if (completed.has(name)) continue;
        const destination = this.destinations[name];
        for (const row of records[name]) {
          const existing = await destination.getById(row.id, context);
          if (existing) continue;
          const result = await destination.create(row, context);
          created.push({ repository: name, id: result?.id || result?.data?.id || row.id });
        }
        completed.add(name);
        await this.auditStore.save({ migrationId, status: "running", completed: [...completed], created, updatedAt: this.now() });
      }
      const destinationRecords = await this.readDestination(context);
      const reconciliation = reconcile(records, destinationRecords, context);
      if (!reconciliation.ok) throw new Error(`Migration reconciliation failed: ${reconciliation.errors.join("; ")}`);
      await this.auditStore.save({ migrationId, status: "completed", completed: [...completed], created, reconciliation, updatedAt: this.now() });
      return { migrationId, dryRun: false, created, reconciliation };
    } catch (error) {
      await this.auditStore.save({ migrationId, status: "failed", completed: [...completed], created, error: error.message, updatedAt: this.now() });
      throw error;
    }
  }

  async rollback(migrationId, context) {
    const audit = await this.auditStore.get(migrationId);
    const removed = [];
    for (const item of [...(audit?.created || [])].reverse()) {
      await this.destinations[item.repository].delete(item.id, context);
      removed.push(item);
    }
    await this.auditStore.save({ ...audit, migrationId, status: "rolled_back", rolledBackAt: this.now(), removed });
    return { migrationId, removed };
  }

  readSource(context) {
    return Object.fromEntries(MIGRATION_ORDER.map((name) => [name, this.sources[name].list(context) || []]));
  }

  async readDestination(context) {
    const pairs = await Promise.all(MIGRATION_ORDER.map(async (name) => [name, await this.destinations[name].list(context)]));
    return Object.fromEntries(pairs.map(([name, value]) => [name, value?.data || value || []]));
  }
}

export function validate(records, context) {
  const errors = [];
  const ids = new Map();
  for (const name of MIGRATION_ORDER) for (const row of records[name] || []) {
    if (!row.id) errors.push(`${name} contains a record without id.`);
    if (row.tenant_id !== context.tenant_id || row.data_scope !== context.data_scope) errors.push(`${name}/${row.id || "unknown"} has invalid tenant ownership.`);
    const key = `${name}:${row.id}`;
    if (ids.has(key)) errors.push(`Duplicate ID ${key}.`); else ids.set(key, true);
  }
  const groupIds = new Set(records.groups.map((row) => row.id));
  const memberIds = new Set(records.members.map((row) => row.id));
  for (const member of records.members) if (!groupIds.has(member.group_id || member.chit_group_id)) errors.push(`Member ${member.id} references a missing group.`);
  for (const name of ["collections", "receipts", "ledger", "finance", "auctions", "payouts"]) for (const row of records[name]) {
    const groupId = row.group_id || row.chit_group_id;
    if (groupId && !groupIds.has(groupId)) errors.push(`${name}/${row.id} references a missing group.`);
    if (row.member_id && !memberIds.has(row.member_id)) errors.push(`${name}/${row.id} references a missing member.`);
  }
  return { ok: errors.length === 0, errors };
}

export function reconcile(source, destination, context) {
  const errors = [];
  const sourceCounts = counts(source); const destinationCounts = counts(destination);
  for (const name of MIGRATION_ORDER) if (destinationCounts[name] < sourceCounts[name]) errors.push(`${name} count is lower than source.`);
  const a = totals(source); const b = totals(destination);
  for (const field of Object.keys(a)) if (Math.abs(a[field] - b[field]) > 0.005) errors.push(`${field} total differs (${a[field]} vs ${b[field]}).`);
  const ownership = validate(destination, context);
  errors.push(...ownership.errors);
  return { ok: errors.length === 0, errors, sourceCounts, destinationCounts, sourceTotals: a, destinationTotals: b };
}

function counts(records) { return Object.fromEntries(MIGRATION_ORDER.map((name) => [name, (records[name] || []).length])); }
function sum(rows, fields) { return rows.reduce((total, row) => total + fields.reduce((n, field) => n + Number(row[field] || 0), 0), 0); }
function totals(records) {
  return {
    collections: sum(records.collections || [], ["paid_amount"]), receipts: sum(records.receipts || [], ["amount"]),
    ledger: sum(records.ledger || [], ["amount"]), finance: sum(records.finance || [], ["amount"]),
    pending: sum(records.collections || [], ["pending_amount"]),
    payouts: (records.payouts || []).reduce((total, row) => total + Number(row.paid_amount ?? row.amount ?? 0), 0),
  };
}
