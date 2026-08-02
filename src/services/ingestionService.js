import { SupabaseAuthService } from "./auth/SupabaseAuthService.js";

const DEFAULT_API_BASE = "/api";

function apiBase() {
  const configured = String(import.meta.env.VITE_PLATFORM_API_URL || DEFAULT_API_BASE).replace(/\/$/, "");
  return configured || DEFAULT_API_BASE;
}

async function authHeaders(workspaceId) {
  const token = await SupabaseAuthService.getAccessToken();
  if (!token) {
    const error = new Error("Authentication required.");
    error.code = "SESSION_EXPIRED";
    throw error;
  }
  const headers = { Authorization: `Bearer ${token}` };
  if (workspaceId) headers["X-Workspace-Id"] = workspaceId;
  return headers;
}

async function parseResponse(response) {
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) {
    const detail = body?.detail;
    const code = typeof detail === "object" ? detail?.code : undefined;
    const message = typeof detail === "object" ? detail?.message : (detail || body?.message || response.statusText);
    const error = new Error(message || "Ingestion request failed.");
    error.code = code || "OCR_FAILED";
    error.status = response.status;
    throw error;
  }
  return body;
}

export async function createIngestionJob(file, {
  workspaceId,
  languageHint = "UNKNOWN",
  batchId,
  signal,
} = {}) {
  const headers = await authHeaders(workspaceId);
  const form = new FormData();
  form.append("file", file);
  form.append("language_hint", languageHint);
  if (batchId) form.append("batch_id", batchId);

  const response = await fetch(`${apiBase()}/v1/ingestion/jobs`, {
    method: "POST",
    headers,
    body: form,
    signal,
  });
  return parseResponse(response);
}

export async function getIngestionJob(jobId, { workspaceId, signal } = {}) {
  const headers = await authHeaders(workspaceId);
  const response = await fetch(`${apiBase()}/v1/ingestion/jobs/${encodeURIComponent(jobId)}`, {
    method: "GET",
    headers,
    signal,
  });
  return parseResponse(response);
}

export async function getIngestionBatch(batchId, { workspaceId, signal } = {}) {
  const headers = await authHeaders(workspaceId);
  const response = await fetch(`${apiBase()}/v1/ingestion/batches/${encodeURIComponent(batchId)}`, {
    method: "GET",
    headers,
    signal,
  });
  return parseResponse(response);
}

export async function saveIngestionDraft(jobId, edits, {
  workspaceId,
  reason = "",
  signal,
} = {}) {
  const headers = await authHeaders(workspaceId);
  headers["Content-Type"] = "application/json";
  const response = await fetch(`${apiBase()}/v1/ingestion/jobs/${encodeURIComponent(jobId)}/draft`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ edits, reason }),
    signal,
  });
  return parseResponse(response);
}

export async function aiReprocessIngestionJob(jobId, { workspaceId, signal } = {}) {
  const headers = await authHeaders(workspaceId);
  const response = await fetch(`${apiBase()}/v1/ingestion/jobs/${encodeURIComponent(jobId)}/ai-reprocess`, {
    method: "POST",
    headers,
    signal,
  });
  return parseResponse(response);
}

export async function confirmIngestionJob(jobId, { workspaceId, reason = "organizer_confirmation", signal } = {}) {
  const headers = await authHeaders(workspaceId);
  headers["Content-Type"] = "application/json";
  const response = await fetch(`${apiBase()}/v1/ingestion/jobs/${encodeURIComponent(jobId)}/confirm`, {
    method: "POST",
    headers,
    body: JSON.stringify({ reason }),
    signal,
  });
  return parseResponse(response);
}

export const INGESTION_ACCEPT =
  ".xlsx,.csv,.pdf,.jpg,.jpeg,.png,.webp,.docx,.doc,application/pdf,image/*,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword";
