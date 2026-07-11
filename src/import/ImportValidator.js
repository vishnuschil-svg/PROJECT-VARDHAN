import { IMPORT_FIELD_SCHEMAS } from "./ImportMapper";

const MOBILE_PATTERN = /^[6-9]\d{9}$/;
const AADHAAR_PATTERN = /^\d{12}$|^X{4}-X{4}-\d{4}$/i;

export function validateMappedRows(mappedRows = [], importType = "Members", existingData = {}) {
  const schema = IMPORT_FIELD_SCHEMAS[importType] || IMPORT_FIELD_SCHEMAS.Members;
  const errors = [];
  const warnings = [];
  const validRows = [];
  const skippedRows = [];
  const memberSignals = new Set((existingData.members || []).map((member) => member.mobile_number).filter(Boolean));
  const receiptSignals = new Set((existingData.receipts || []).map((receipt) => receipt.receipt_number).filter(Boolean));
  const groupSignals = new Set((existingData.groups || []).map((group) => group.id).filter(Boolean));

  mappedRows.forEach((row) => {
    const rowErrors = [];
    const rowWarnings = [];

    schema.required.forEach((field) => {
      if (isBlank(row.data[field])) {
        rowErrors.push(createIssue(row, "Missing Required Fields", `${field} is required.`));
      }
    });

    if (row.data.mobile_number && !MOBILE_PATTERN.test(String(row.data.mobile_number).replace(/\D/g, ""))) {
      rowErrors.push(createIssue(row, "Invalid Mobile", "Mobile number must be a valid 10 digit Indian mobile."));
    }

    if (row.data.aadhaar_masked && !AADHAAR_PATTERN.test(String(row.data.aadhaar_masked).trim())) {
      rowWarnings.push(createIssue(row, "Invalid Aadhaar", "Aadhaar should be 12 digits or masked as XXXX-XXXX-1234."));
    }

    if (row.data.mobile_number && memberSignals.has(row.data.mobile_number)) {
      rowWarnings.push(createIssue(row, "Duplicate Member", "A member with this mobile number already exists."));
    }

    if (row.data.receipt_number && receiptSignals.has(row.data.receipt_number)) {
      rowErrors.push(createIssue(row, "Duplicate Receipt", "Receipt number already exists."));
    }

    ["amount", "paid_amount", "pending_amount", "monthly_amount", "chit_value", "bid_amount", "lift_amount"].forEach((field) => {
      if (!isBlank(row.data[field]) && Number(row.data[field]) < 0) {
        rowErrors.push(createIssue(row, "Invalid Amount", `${field} cannot be negative.`));
      }
    });

    if (!isBlank(row.data.monthly_amount) && Number(row.data.monthly_amount) <= 0) {
      rowErrors.push(createIssue(row, "Invalid Installment", "Monthly installment must be greater than zero."));
    }

    if (row.data.group_id && groupSignals.size && !groupSignals.has(row.data.group_id)) {
      rowWarnings.push(createIssue(row, "Invalid Group", "Group was not found in the current workspace."));
    }

    if (row.data.chit_group_id && groupSignals.size && !groupSignals.has(row.data.chit_group_id)) {
      rowWarnings.push(createIssue(row, "Invalid Group", "Chit group was not found in the current workspace."));
    }

    errors.push(...rowErrors);
    warnings.push(...rowWarnings);

    if (rowErrors.length) {
      skippedRows.push(row);
    } else {
      validRows.push(row);
    }
  });

  return {
    errors,
    warnings,
    validRows,
    skippedRows,
    isValid: errors.length === 0,
  };
}

function createIssue(row, type, message) {
  return {
    rowNumber: row.rowNumber,
    type,
    message,
  };
}

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}
