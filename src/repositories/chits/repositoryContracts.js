export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 50;

export class ChitRepositoryContract {
  create() {
    throw new Error("Repository create() is not implemented.");
  }

  update() {
    throw new Error("Repository update() is not implemented.");
  }

  delete() {
    throw new Error("Repository delete() is not implemented.");
  }

  getById() {
    throw new Error("Repository getById() is not implemented.");
  }

  list() {
    throw new Error("Repository list() is not implemented.");
  }

  search() {
    throw new Error("Repository search() is not implemented.");
  }
}

export function getTenantScope(activeTenantContext) {
  const tenantId = activeTenantContext?.tenant_id || activeTenantContext?.tenantId || "";
  const dataScope = activeTenantContext?.data_scope || activeTenantContext?.dataScope || "";

  return {
    tenant_id: tenantId,
    data_scope: dataScope,
    scope_key: tenantId && dataScope ? `${tenantId}::${dataScope}` : "",
  };
}

export function requireTenantScope(activeTenantContext) {
  const scope = getTenantScope(activeTenantContext);

  if (!scope.scope_key) {
    throw new Error("Tenant and data scope are required for repository writes.");
  }

  return scope;
}

export function hasTenantScope(activeTenantContext) {
  return Boolean(getTenantScope(activeTenantContext).scope_key);
}

export function normalizePagination(options = {}) {
  const page = Math.max(Number(options.page || DEFAULT_PAGE), 1);
  const pageSize = Math.max(Number(options.pageSize || options.limit || DEFAULT_PAGE_SIZE), 1);

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
  };
}

export function createPage(data, options = {}) {
  const pagination = normalizePagination(options);
  const total = data.length;
  const rows = data.slice(pagination.offset, pagination.offset + pagination.pageSize);
  const totalPages = Math.max(Math.ceil(total / pagination.pageSize), 1);

  return {
    data: rows,
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages,
    hasNextPage: pagination.page < totalPages,
    hasPreviousPage: pagination.page > 1,
  };
}
