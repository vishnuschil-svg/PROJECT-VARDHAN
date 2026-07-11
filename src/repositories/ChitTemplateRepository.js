import { listScopedRows, upsertScopedRow } from "./scopedStorageRepository.js";

const STORAGE_KEY = "vardhan.chit.templates.v1";

export const ChitTemplateRepository = {
  list(activeTenantContext) {
    return listScopedRows(STORAGE_KEY, activeTenantContext);
  },
  save(template, activeTenantContext) {
    return upsertScopedRow(STORAGE_KEY, template, activeTenantContext, "template");
  },
  search(query = "", activeTenantContext) {
    const normalized = String(query || "").toLowerCase();
    return this.list(activeTenantContext).filter((template) =>
      [template.name, template.description, ...(template.tags || [])].join(" ").toLowerCase().includes(normalized)
    );
  },
};
