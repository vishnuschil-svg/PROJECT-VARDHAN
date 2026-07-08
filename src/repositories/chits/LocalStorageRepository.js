import {
  ChitRepositoryContract,
  createPage,
  getTenantScope,
  requireTenantScope,
} from "./repositoryContracts";

export class LocalStorageRepository extends ChitRepositoryContract {
  constructor({
    storageKey,
    entityName,
    searchableFields = [],
    normalize = (record) => record,
    sort = defaultSort,
  }) {
    super();
    this.storageKey = storageKey;
    this.entityName = entityName;
    this.searchableFields = searchableFields;
    this.normalize = normalize;
    this.sort = sort;
  }

  create(record, options = {}) {
    const scope = requireTenantScope(options.activeTenantContext);
    const now = new Date().toISOString();
    const entity = this.normalize({
      ...record,
      id: record.id || this.createId(),
      tenant_id: scope.tenant_id,
      data_scope: scope.data_scope,
      scope_key: scope.scope_key,
      created_at: record.created_at || now,
      updated_at: now,
    });
    const next = [
      entity,
      ...this.readAll().filter((item) => item.id !== entity.id),
    ];

    this.writeAll(next);
    return entity;
  }

  update(id, patch, options = {}) {
    const scope = requireTenantScope(options.activeTenantContext);
    const existing = this.readAll();
    const current = existing.find((item) => item.id === id && item.scope_key === scope.scope_key);

    if (!current) {
      return null;
    }

    const updated = this.normalize({
      ...current,
      ...patch,
      id,
      tenant_id: scope.tenant_id,
      data_scope: scope.data_scope,
      scope_key: scope.scope_key,
      updated_at: new Date().toISOString(),
    });
    const next = existing.map((item) => (item.id === id ? updated : item));

    this.writeAll(next);
    return updated;
  }

  delete(id, options = {}) {
    const scope = requireTenantScope(options.activeTenantContext);
    const existing = this.readAll();
    const next = existing.filter((item) => !(item.id === id && item.scope_key === scope.scope_key));

    this.writeAll(next);
    return next.length !== existing.length;
  }

  getById(id, options = {}) {
    const scope = getTenantScope(options.activeTenantContext);

    if (!scope.scope_key && !options.allowAllTenants) {
      return null;
    }

    return this.readAll().find(
      (item) => item.id === id && (options.allowAllTenants || item.scope_key === scope.scope_key)
    ) || null;
  }

  list(options = {}) {
    const rows = this.getTenantRows(options);
    return createPage(rows, options);
  }

  search(query = "", options = {}) {
    const normalizedQuery = String(query || "").trim().toLowerCase();
    const rows = normalizedQuery
      ? this.getTenantRows(options).filter((item) => this.matchesSearch(item, normalizedQuery))
      : this.getTenantRows(options);

    return createPage(rows, options);
  }

  upsert(record, options = {}) {
    if (record.id && this.getById(record.id, options)) {
      return this.update(record.id, record, options);
    }

    return this.create(record, options);
  }

  getTenantRows(options = {}) {
    const scope = getTenantScope(options.activeTenantContext);

    if (!scope.scope_key && !options.allowAllTenants) {
      return [];
    }

    return this.readAll()
      .filter((item) => options.allowAllTenants || item.scope_key === scope.scope_key)
      .sort(this.sort);
  }

  matchesSearch(item, normalizedQuery) {
    return this.searchableFields.some((field) =>
      String(item[field] || "").toLowerCase().includes(normalizedQuery)
    );
  }

  createId() {
    return `${this.entityName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  readAll() {
    if (!canUseLocalStorage()) {
      return [];
    }

    try {
      const raw = window.localStorage.getItem(this.storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  writeAll(records) {
    if (!canUseLocalStorage()) {
      return;
    }

    window.localStorage.setItem(this.storageKey, JSON.stringify(records));
  }
}

export function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function defaultSort(a, b) {
  return new Date(b.created_at || b.updated_at || 0) - new Date(a.created_at || a.updated_at || 0);
}
