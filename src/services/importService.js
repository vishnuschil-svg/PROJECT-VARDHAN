import { ImportEngine } from "../import/ImportEngine";
import { ImportRepository, IMPORT_SOURCES, IMPORT_TYPES } from "../repositories/ImportRepository";
import { WorkspaceRepository } from "../repositories/WorkspaceRepository";
import {
  AuctionRepository,
  CollectionsRepository,
  FinanceRepository,
  GroupsRepository,
  MembersRepository,
  ReceiptsRepository,
} from "../repositories/chits";

export { IMPORT_SOURCES, IMPORT_TYPES };

export async function analyzeImportFile({ file, importType = IMPORT_TYPES.MEMBERS }) {
  const workspaceContext = WorkspaceRepository.getCurrentWorkspaceContext();
  const sourceType = detectSourceType(file?.name || "");
  const rows = await parseFileRows(file, sourceType);
  const analysis = ImportEngine.analyze({
    rows,
    importType,
    existingData: getExistingData(workspaceContext),
    fileName: file?.name || "",
  });

  return ImportRepository.createSession({
    ...analysis,
    importType,
    sourceType,
    workspaceContext,
  });
}

export function remapImportSession({ sessionId, mappedFields }) {
  const session = ImportRepository.getSession(sessionId);

  if (!session) {
    return null;
  }

  const analysis = ImportEngine.remap({
    rows: session.rows,
    importType: session.importType,
    mappedFields,
    existingData: getExistingData(WorkspaceRepository.getCurrentWorkspaceContext()),
  });

  return ImportRepository.updateSession(sessionId, analysis);
}

export function commitImportSession(sessionId) {
  const session = ImportRepository.getSession(sessionId);

  if (!session) {
    return null;
  }

  const saved = saveValidRows(session);
  return ImportRepository.updateSession(sessionId, {
    ...ImportEngine.commit(session),
    savedRows: saved,
    summary: {
      ...session.summary,
      imported: saved.length,
      skipped: session.validation?.skippedRows?.length || 0,
      warnings: session.validation?.warnings?.length || 0,
      errors: session.validation?.errors?.length || 0,
      totalRows: session.rows?.length || 0,
    },
  });
}

export function listImportSessions() {
  return ImportRepository.listSessions();
}

function getExistingData(activeTenantContext) {
  if (!activeTenantContext?.tenant_id || !activeTenantContext?.data_scope) {
    return {
      groups: [],
      members: [],
      collections: [],
      receipts: [],
      financeEntries: [],
      auctions: [],
    };
  }

  const options = { activeTenantContext, pageSize: Number.MAX_SAFE_INTEGER };

  return {
    groups: GroupsRepository.list(options).data,
    members: MembersRepository.list(options).data,
    collections: CollectionsRepository.list(options).data,
    receipts: ReceiptsRepository.list(options).data,
    financeEntries: FinanceRepository.list(options).data,
    auctions: AuctionRepository.list(options).data,
  };
}

function detectSourceType(fileName) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension === "csv") return IMPORT_SOURCES.CSV;
  if (extension === "json") return IMPORT_SOURCES.JSON;
  if (extension === "xlsx" || extension === "xls") return IMPORT_SOURCES.EXCEL;
  if (extension === "pdf") return IMPORT_SOURCES.PDF;
  if (["png", "jpg", "jpeg", "webp"].includes(extension)) return IMPORT_SOURCES.IMAGE_OCR;
  return IMPORT_SOURCES.CSV;
}

async function parseFileRows(file, sourceType) {
  if (!file) {
    return [];
  }

  if (sourceType === IMPORT_SOURCES.EXCEL) {
    return [
      {
        import_note: "Local Excel fallback active. Save spreadsheet as CSV for automatic parsing, or use the manual mapping/capture fields before confirming import.",
      },
    ];
  }

  if (sourceType === IMPORT_SOURCES.PDF || sourceType === IMPORT_SOURCES.IMAGE_OCR) {
    return [
      {
        import_note: "Local manual extraction fallback active. External OCR provider is not configured.",
      },
    ];
  }

  const text = await file.text();

  if (sourceType === IMPORT_SOURCES.JSON) {
    const parsed = JSON.parse(text || "[]");
    return Array.isArray(parsed) ? parsed : [parsed];
  }

  return parseCSV(text);
}

function saveValidRows(session) {
  const activeTenantContext = WorkspaceRepository.getCurrentWorkspaceContext();

  if (!activeTenantContext?.tenant_id || !activeTenantContext?.data_scope) {
    return [];
  }

  const repository = getRepositoryForImportType(session.importType);

  if (!repository) {
    return [];
  }

  return (session.validation?.validRows || []).map((row) => {
    const payload = normalizeImportPayload(row.data, session.importType);
    return repository.upsert(payload, { activeTenantContext });
  });
}

function getRepositoryForImportType(importType) {
  const map = {
    [IMPORT_TYPES.MEMBERS]: MembersRepository,
    [IMPORT_TYPES.CHIT_GROUPS]: GroupsRepository,
    [IMPORT_TYPES.COLLECTIONS]: CollectionsRepository,
    [IMPORT_TYPES.RECEIPTS]: ReceiptsRepository,
    [IMPORT_TYPES.FINANCE]: FinanceRepository,
    [IMPORT_TYPES.AUCTIONS]: AuctionRepository,
  };

  return map[importType] || null;
}

function normalizeImportPayload(row, importType) {
  const idPrefix = String(importType || "import").toLowerCase().replace(/\s+/g, "-");
  const base = {
    ...row,
    id: row.id || row.member_id || row.receipt_number || row.chit_code || `${idPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: row.created_at || new Date().toISOString(),
  };

  if (importType === IMPORT_TYPES.CHIT_GROUPS) {
    return {
      ...base,
      chit_value: Number(base.chit_value || 0),
      monthly_amount: Number(base.monthly_amount || 0),
      total_members: Number(base.total_members || 0),
      total_months: Number(base.total_months || base.total_members || 0),
      status: base.status || "upcoming",
    };
  }

  if (importType === IMPORT_TYPES.COLLECTIONS) {
    return {
      ...base,
      paid_amount: Number(base.paid_amount || 0),
      pending_amount: Number(base.pending_amount || 0),
      payment_method: base.payment_method || "Cash",
    };
  }

  if (importType === IMPORT_TYPES.RECEIPTS) {
    return {
      ...base,
      amount: Number(base.amount || 0),
      can_print_pdf: true,
      can_print_whatsapp: true,
    };
  }

  if (importType === IMPORT_TYPES.FINANCE) {
    return {
      ...base,
      amount: Number(base.amount || 0),
      status: base.status || "Posted",
    };
  }

  return {
    ...base,
    status: base.status || "active",
  };
}

function parseCSV(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  const headers = parseCSVLine(lines[0] || "");

  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    return headers.reduce((row, header, index) => {
      row[header] = values[index] || "";
      return row;
    }, {});
  });
}

function parseCSVLine(line) {
  const values = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === "\"" && quoted && nextCharacter === "\"") {
      current += "\"";
      index += 1;
    } else if (character === "\"") {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  values.push(current.trim());
  return values;
}
