import { WorkspaceRepository } from "./WorkspaceRepository";

const IMPORT_STORAGE_KEY = "vardhan.import.sessions.v1";

export const IMPORT_TYPES = {
  MEMBERS: "Members",
  CHIT_GROUPS: "Chit Groups",
  COLLECTIONS: "Collections",
  RECEIPTS: "Receipts",
  FINANCE: "Finance",
  AUCTIONS: "Auctions",
};

export const IMPORT_SOURCES = {
  EXCEL: "Excel",
  CSV: "CSV",
  JSON: "JSON",
  PDF: "Future PDF",
  IMAGE_OCR: "Future Image OCR",
};

export const ImportRepository = {
  createSession(payload) {
    const session = normalizeSession(payload);
    writeSessions([session, ...readSessions()]);
    return session;
  },

  updateSession(sessionId, patch) {
    const sessions = readSessions();
    const next = sessions.map((session) =>
      session.id === sessionId
        ? normalizeSession({ ...session, ...patch, id: sessionId, createdAt: session.createdAt })
        : session
    );

    writeSessions(next);
    return next.find((session) => session.id === sessionId) || null;
  },

  getSession(sessionId) {
    return readSessions().find((session) => session.id === sessionId) || null;
  },

  listSessions() {
    const context = WorkspaceRepository.getCurrentWorkspaceContext();

    return readSessions().filter(
      (session) => !context?.workspace_id || session.workspaceId === context.workspace_id
    );
  },
};

function normalizeSession(payload = {}) {
  const context = payload.workspaceContext || WorkspaceRepository.getCurrentWorkspaceContext();
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const validation = payload.validation || { errors: [], warnings: [], validRows: [], skippedRows: [] };
  const summary = payload.summary || createSummary({ rows, validation });

  return {
    id: payload.id || `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    workspaceId: context?.workspace_id || payload.workspaceId || "",
    importType: payload.importType || IMPORT_TYPES.MEMBERS,
    sourceType: payload.sourceType || IMPORT_SOURCES.CSV,
    fileName: payload.fileName || "",
    rows,
    mappedFields: payload.mappedFields || {},
    validation,
    summary,
    status: payload.status || "preview",
    createdAt: payload.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createSummary({ rows, validation }) {
  return {
    imported: 0,
    skipped: validation.skippedRows?.length || 0,
    warnings: validation.warnings?.length || 0,
    errors: validation.errors?.length || 0,
    totalRows: rows.length,
  };
}

function readSessions() {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(IMPORT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSessions(sessions) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(IMPORT_STORAGE_KEY, JSON.stringify(sessions));
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}
