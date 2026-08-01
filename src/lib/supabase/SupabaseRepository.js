import { getSupabaseClient, isSupabaseConfigured } from "./SupabaseClient.js";
import { SupabaseRealtime } from "./SupabaseRealtime.js";
import {
  SUPABASE_ERROR_MESSAGES,
  createErrorResponse,
  createSuccessResponse,
  mapSupabaseError,
} from "./SupabaseErrorHandler.js";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;

export class SupabaseRepository {
  constructor({
    tableName,
    primaryKey = "id",
    searchableFields = [],
    defaultSort = { column: "created_at", ascending: false },
    normalizeInput = (record) => record,
    normalizeOutput = (record) => record,
  }) {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
    this.searchableFields = searchableFields;
    this.defaultSort = defaultSort;
    this.normalizeInput = normalizeInput;
    this.normalizeOutput = normalizeOutput;
  }

  async getById(id, options = {}) {
    return this.execute(async () => {
      const scope = requireTenantScope(options.activeTenantContext);
      const { data, error } = await this.applyTenantScope(
        this.client()
          .from(this.tableName)
          .select(options.select || "*")
          .eq(this.primaryKey, id),
        scope
      ).maybeSingle();

      if (error) return createErrorResponse(error, mapSupabaseError(error));
      return createSuccessResponse(data ? this.normalizeOutput(data) : null, data ? "Record loaded." : "Record not found.");
    });
  }

  async getAll(options = {}) {
    return this.execute(async () => {
      const scope = requireTenantScope(options.activeTenantContext);
      const pagination = normalizePagination(options);
      const sort = options.sort || this.defaultSort;
      let query = this.applyTenantScope(
        this.client()
          .from(this.tableName)
          .select(options.select || "*", { count: "exact" }),
        scope
      );

      query = applyFilters(query, options.filters);
      query = query
        .order(sort.column, { ascending: Boolean(sort.ascending) })
        .range(pagination.from, pagination.to);

      const { data, error, count } = await query;

      if (error) return createErrorResponse(error, mapSupabaseError(error));

      return createSuccessResponse(
        (data || []).map((record) => this.normalizeOutput(record)),
        "Records loaded.",
        createPaginationMeta({ count, pagination })
      );
    });
  }

  async list(options = {}) {
    return this.getAll(options);
  }

  async search(queryText = "", options = {}) {
    return this.execute(async () => {
      const filters = {
        ...(options.filters || {}),
      };
      const normalizedQuery = String(queryText || "").trim();
      const scope = requireTenantScope(options.activeTenantContext);
      const pagination = normalizePagination(options);
      const sort = options.sort || this.defaultSort;
      let query = this.applyTenantScope(
        this.client()
          .from(this.tableName)
          .select(options.select || "*", { count: "exact" }),
        scope
      );

      query = applyFilters(query, filters);

      if (normalizedQuery && this.searchableFields.length) {
        query = query.or(
          this.searchableFields
            .map((field) => `${field}.ilike.%${escapeSearchTerm(normalizedQuery)}%`)
            .join(",")
        );
      }

      const { data, error, count } = await query
        .order(sort.column, { ascending: Boolean(sort.ascending) })
        .range(pagination.from, pagination.to);

      if (error) return createErrorResponse(error, mapSupabaseError(error));

      return createSuccessResponse(
        (data || []).map((record) => this.normalizeOutput(record)),
        "Search completed.",
        createPaginationMeta({ count, pagination })
      );
    });
  }

  async create(record, options = {}) {
    return this.execute(async () => {
      const scope = requireTenantScope(options.activeTenantContext);
      const payload = this.normalizeInput({
        ...record,
        tenant_id: scope.tenant_id,
        data_scope: scope.data_scope,
      });
      const { data, error } = await this.client()
        .from(this.tableName)
        .insert(payload)
        .select(options.select || "*")
        .single();

      if (error) return createErrorResponse(error, mapSupabaseError(error));
      return createSuccessResponse(this.normalizeOutput(data), "Record created.");
    });
  }

  async update(id, patch, options = {}) {
    return this.execute(async () => {
      const scope = requireTenantScope(options.activeTenantContext);
      const payload = this.normalizeInput({
        ...patch,
        updated_at: new Date().toISOString(),
      });
      const { data, error } = await this.applyTenantScope(
        this.client()
          .from(this.tableName)
          .update(payload)
          .eq(this.primaryKey, id),
        scope
      )
        .select(options.select || "*")
        .single();

      if (error) return createErrorResponse(error, mapSupabaseError(error));
      return createSuccessResponse(this.normalizeOutput(data), "Record updated.");
    });
  }

  async delete(id, options = {}) {
    return this.execute(async () => {
      const scope = requireTenantScope(options.activeTenantContext);
      const { data, error } = await this.applyTenantScope(
        this.client()
          .from(this.tableName)
          .delete()
          .eq(this.primaryKey, id),
        scope
      )
        .select(options.select || "*")
        .single();

      if (error) return createErrorResponse(error, mapSupabaseError(error));
      return createSuccessResponse(data ? this.normalizeOutput(data) : null, "Record deleted.");
    });
  }

  subscribe(options = {}) {
    try {
      const scope = requireTenantScope(options.activeTenantContext);
      return SupabaseRealtime.subscribe({
        table: this.tableName,
        tenantScope: scope,
        event: options.event || "*",
        callback: options.callback,
      });
    } catch (error) {
      return createErrorResponse(error, error.message);
    }
  }

  client() {
    return getSupabaseClient();
  }

  applyTenantScope(query, scope) {
    return query.eq("tenant_id", scope.tenant_id).eq("data_scope", scope.data_scope);
  }

  async execute(operation) {
    if (!isSupabaseConfigured) {
      return createErrorResponse(null, SUPABASE_ERROR_MESSAGES.CONFIG_MISSING);
    }

    try {
      return await operation();
    } catch (error) {
      return createErrorResponse(error, error.message || SUPABASE_ERROR_MESSAGES.UNKNOWN);
    }
  }
}

export function getTenantScope(activeTenantContext = {}) {
  return {
    tenant_id: activeTenantContext.tenant_id || activeTenantContext.tenantId || "",
    data_scope: activeTenantContext.data_scope || activeTenantContext.dataScope || "",
  };
}

export function requireTenantScope(activeTenantContext = {}) {
  const scope = getTenantScope(activeTenantContext);

  if (!scope.tenant_id || !scope.data_scope) {
    throw new Error(SUPABASE_ERROR_MESSAGES.TENANT_REQUIRED);
  }

  return scope;
}

function normalizePagination(options = {}) {
  const page = Math.max(Number(options.page || DEFAULT_PAGE), 1);
  const pageSize = Math.max(Number(options.pageSize || options.limit || DEFAULT_PAGE_SIZE), 1);
  const from = (page - 1) * pageSize;

  return {
    page,
    pageSize,
    from,
    to: from + pageSize - 1,
  };
}

function createPaginationMeta({ count, pagination }) {
  const total = Number(count || 0);
  const totalPages = Math.max(Math.ceil(total / pagination.pageSize), 1);

  return {
    pagination: {
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPreviousPage: pagination.page > 1,
    },
  };
}

function applyFilters(query, filters = {}) {
  return Object.entries(filters).reduce((nextQuery, [field, value]) => {
    if (value === undefined || value === null || value === "" || value === "all") {
      return nextQuery;
    }

    if (Array.isArray(value)) {
      return nextQuery.in(field, value);
    }

    if (typeof value === "object") {
      let scopedQuery = nextQuery;
      if (value.gte !== undefined) scopedQuery = scopedQuery.gte(field, value.gte);
      if (value.lte !== undefined) scopedQuery = scopedQuery.lte(field, value.lte);
      if (value.eq !== undefined) scopedQuery = scopedQuery.eq(field, value.eq);
      if (value.ilike !== undefined) scopedQuery = scopedQuery.ilike(field, value.ilike);
      return scopedQuery;
    }

    return nextQuery.eq(field, value);
  }, query);
}

function escapeSearchTerm(value) {
  return String(value).replace(/[%_,]/g, "");
}
