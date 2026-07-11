import { detectMappedFields, mapRows } from "./ImportMapper";
import { validateMappedRows } from "./ImportValidator";
import { createImportPreview, createImportSummary } from "./ImportPreview";

export const IMPORT_ENGINE_CAPABILITIES = {
  supportsCSV: true,
  supportsJSON: true,
  supportsExcel: "provider-ready",
  supportsPDF: "future",
  supportsImageOCR: "future",
};

export const ImportEngine = {
  analyze({ rows = [], importType, existingData = {}, fileName = "" }) {
    const headers = Object.keys(rows[0] || {});
    const mappedFields = detectMappedFields(headers, importType);
    const mappedRows = mapRows(rows, mappedFields);
    const validation = validateMappedRows(mappedRows, importType, existingData);
    const preview = createImportPreview({ rows, mappedRows, validation });
    const summary = createImportSummary({ rows, validation });

    return {
      fileName,
      rows,
      mappedFields,
      mappedRows,
      validation,
      preview,
      summary,
    };
  },

  remap({ rows = [], importType, mappedFields = {}, existingData = {} }) {
    const mappedRows = mapRows(rows, mappedFields);
    const validation = validateMappedRows(mappedRows, importType, existingData);
    const preview = createImportPreview({ rows, mappedRows, validation });
    const summary = createImportSummary({ rows, validation });

    return {
      rows,
      mappedFields,
      mappedRows,
      validation,
      preview,
      summary,
    };
  },

  commit(analysis) {
    const imported = analysis.validation?.validRows?.length || 0;

    return {
      ...analysis,
      summary: createImportSummary({
        rows: analysis.rows,
        validation: analysis.validation,
        imported,
      }),
      status: "imported",
    };
  },
};
