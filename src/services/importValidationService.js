import { validateMappedRows } from "../import/ImportValidator";

export function validateImportRows({ mappedRows = [], importType, existingData = {} }) {
  return validateMappedRows(mappedRows, importType, existingData);
}
