export function createImportPreview({ rows = [], mappedRows = [], validation = {} }) {
  return {
    columns: Object.keys(mappedRows[0]?.data || rows[0] || {}),
    rows: mappedRows.slice(0, 25),
    totalRows: rows.length,
    validRows: validation.validRows?.length || 0,
    skippedRows: validation.skippedRows?.length || 0,
  };
}

export function createImportSummary({ rows = [], validation = {}, imported = 0 }) {
  return {
    imported,
    skipped: validation.skippedRows?.length || 0,
    warnings: validation.warnings?.length || 0,
    errors: validation.errors?.length || 0,
    totalRows: rows.length,
  };
}
