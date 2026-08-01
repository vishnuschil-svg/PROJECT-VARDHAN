import { SupabaseAuthService } from "../../services/auth/SupabaseAuthService.js";

const DEFAULT_TIMEOUT_MS = 180000;
const DEFAULT_API_BASE = "/api";
const SUPPORTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const ERROR_CODES = new Set([
  "OCR_NOT_CONFIGURED",
  "OCR_TIMEOUT",
  "OCR_RATE_LIMIT",
  "OCR_PROVIDER_UNAVAILABLE",
  "OCR_FAILED",
  "OCR_SCHEMA_INVALID",
  "DOCUMENT_UNREADABLE",
  "MANUAL_FALLBACK_USED",
  "SESSION_EXPIRED",
  "WORKSPACE_ACCESS_DENIED",
  "FILE_TOO_LARGE",
  "UNSUPPORTED_FILE",
  "INVALID_UPLOAD",
]);

export class OCRProviderError extends Error {
  constructor(code, message, { status = 0, retryable = false, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = "OCRProviderError";
    this.code = ERROR_CODES.has(code) ? code : "OCR_FAILED";
    this.status = status;
    this.retryable = retryable;
  }
}

export function createExternalOCRProviderAdapter({
  apiBaseUrl,
  endpoint,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  getSession = defaultSession,
  getAccessToken,
  refreshSession = defaultRefreshSession,
} = {}) {
  const environment = import.meta.env || {};
  const normalizedBase = String(
    apiBaseUrl ?? environment.VITE_PLATFORM_API_URL ?? DEFAULT_API_BASE
  ).replace(/\/$/, "");
  const normalizedEndpoint = String(
    endpoint || `${normalizedBase}/v1/ocr/extract`
  ).trim();
  const sessionLoader = getAccessToken
    ? async () => ({ access_token: await getAccessToken() })
    : getSession;

  return Object.freeze({
    name: "EXTERNAL_OCR_PROVIDER_ADAPTER",
    boundary: "AUTHENTICATED_SERVER_PROXY_ONLY",
    isConfigured() {
      return Boolean(normalizedEndpoint && typeof fetchImpl === "function");
    },
    async extract(file, {
      workspaceId,
      documentType = "CHIT_REGISTER",
      languageHint = "UNKNOWN",
      signal,
    } = {}) {
      validateFile(file);
      let session = await sessionLoader();
      if (!session?.access_token) {
        throw new OCRProviderError(
          "SESSION_EXPIRED",
          "Your session has expired. Sign in again to extract this document.",
          { status: 401 }
        );
      }
      if (!workspaceId) {
        throw new OCRProviderError(
          "WORKSPACE_ACCESS_DENIED",
          "Select a business workspace before extracting a document."
        );
      }

      const controller = new AbortController();
      const abortFromCaller = () => controller.abort();
      signal?.addEventListener?.("abort", abortFromCaller, { once: true });
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const body = new FormData();
        body.append("file", file, file.name);
        body.append("document_type", documentType);
        body.append("language_hint", languageHint);
        let response = await sendRequest(fetchImpl, normalizedEndpoint, body, session.access_token, workspaceId, controller.signal);
        if (response.status === 401 && typeof refreshSession === "function") {
          const refreshed = await refreshSession();
          session = refreshed?.access_token ? refreshed : refreshed?.session;
          if (session?.access_token) {
            response = await sendRequest(fetchImpl, normalizedEndpoint, body, session.access_token, workspaceId, controller.signal);
          }
        }
        const result = await readJsonSafely(response);
        if (!response.ok) {
          const detail = result?.detail && typeof result.detail === "object"
            ? result.detail
            : result;
          const backendMessage = typeof result?.detail === "string"
            ? result.detail
            : detail?.message;
          throw new OCRProviderError(
            normalizeErrorCode(detail?.code, response.status),
            safeResponseMessage(response.status, backendMessage),
            {
              status: response.status,
              retryable: Boolean(detail?.retryable || response.status >= 500),
            }
          );
        }
        return normalizeOCRResponse(result);
      } catch (error) {
        if (error?.name === "AbortError") {
          throw new OCRProviderError(
            "OCR_TIMEOUT",
            "Document extraction timed out.",
            { retryable: true, cause: error }
          );
        }
        if (error instanceof OCRProviderError) throw error;
        throw new OCRProviderError(
          "OCR_FAILED",
          "Document extraction request failed.",
          { retryable: true, cause: error }
        );
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener?.("abort", abortFromCaller);
      }
    },
  });
}

export function normalizeOCRResponse(result) {
  if (!result || result.status !== "SUCCESS" || typeof result.documentId !== "string") {
    throw new OCRProviderError(
      "OCR_SCHEMA_INVALID",
      "Document extraction response has an invalid status or document ID."
    );
  }
  if (typeof result.provider !== "string" || typeof result.rawText !== "string") {
    throw new OCRProviderError(
      "OCR_SCHEMA_INVALID",
      "Document extraction response is missing provider metadata."
    );
  }
  if (!result.extraction || typeof result.extraction !== "object" || Array.isArray(result.extraction)) {
    throw new OCRProviderError(
      "OCR_SCHEMA_INVALID",
      "Document extraction response is missing structured extraction data."
    );
  }
  const confidence = result.confidence;
  if (
    !confidence
    || !Number.isFinite(Number(confidence.overallScore))
    || Number(confidence.overallScore) < 0
    || Number(confidence.overallScore) > 1
  ) {
    throw new OCRProviderError(
      "OCR_SCHEMA_INVALID",
      "Document extraction response has invalid confidence metadata."
    );
  }
  const hasExtractedValue = [
    "chitName", "chitValue", "durationMonths", "memberCount", "monthlyInstallment",
  ].some((key) => result.extraction[key] !== null && result.extraction[key] !== undefined && result.extraction[key] !== "")
    || (Array.isArray(result.extraction.installmentSchedule) && result.extraction.installmentSchedule.length > 0);
  if (!hasExtractedValue) {
    throw new OCRProviderError(
      "DOCUMENT_UNREADABLE",
      "No usable chit details were extracted from the document."
    );
  }
  return {
    status: "SUCCESS",
    documentId: result.documentId,
    provider: result.provider,
    rawText: result.rawText,
    documentType: result.documentType || "UNKNOWN",
    languageDetected: result.languageDetected || "UNKNOWN",
    extraction: {
      ...result.extraction,
      members: Array.isArray(result.extraction.members) ? result.extraction.members : [],
      installmentSchedule: Array.isArray(result.extraction.installmentSchedule)
        ? result.extraction.installmentSchedule
        : [],
      auctionHistory: Array.isArray(result.extraction.auctionHistory) ? result.extraction.auctionHistory : [],
      collections: Array.isArray(result.extraction.collections) ? result.extraction.collections : [],
      dividends: Array.isArray(result.extraction.dividends) ? result.extraction.dividends : [],
    },
    confidence: {
      overallScore: Number(confidence.overallScore),
      fieldScores: confidence.fieldScores && typeof confidence.fieldScores === "object"
        ? { ...confidence.fieldScores }
        : {},
      mathValidated: Boolean(confidence.mathValidated),
      requiresHumanReview: Boolean(confidence.requiresHumanReview),
    },
    missingFields: Array.isArray(result.missingFields) ? [...result.missingFields] : [],
    warnings: Array.isArray(result.warnings) ? [...result.warnings] : [],
  };
}

const runtimeEnvironment = import.meta.env || {};

export const ExternalOCRProviderAdapter = createExternalOCRProviderAdapter({
  apiBaseUrl: runtimeEnvironment.VITE_PLATFORM_API_URL || DEFAULT_API_BASE,
  timeoutMs: DEFAULT_TIMEOUT_MS,
});

async function readJsonSafely(response) {
  const contentType = response.headers?.get?.("content-type") || "";
  if (contentType && !contentType.toLowerCase().includes("json")) {
    throw new OCRProviderError(
      "OCR_SCHEMA_INVALID",
      "Document extraction service returned a non-JSON response.",
      { status: response.status }
    );
  }
  try {
    return await response.json();
  } catch (error) {
    throw new OCRProviderError(
      "OCR_SCHEMA_INVALID",
      "Document extraction service returned invalid JSON.",
      { status: response.status, cause: error }
    );
  }
}

async function defaultSession() {
  return (await SupabaseAuthService.getSession())?.session || null;
}

async function defaultRefreshSession() {
  return (await SupabaseAuthService.refreshSession())?.session || null;
}

function validateFile(file) {
  if (!file?.name || typeof file.size !== "number") {
    throw new OCRProviderError("OCR_FAILED", "A valid OCR document is required.");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new OCRProviderError("FILE_TOO_LARGE", "The selected document exceeds the 15 MB limit.", { status: 413 });
  }
  if (file.type && !SUPPORTED_TYPES.has(file.type)) {
    throw new OCRProviderError(
      "UNSUPPORTED_FILE",
      "Choose a PNG, JPEG, WebP, or PDF document.",
      { status: 415 }
    );
  }
}

function sendRequest(fetchImpl, endpoint, body, accessToken, workspaceId, signal) {
  return fetchImpl(endpoint, {
    method: "POST",
    body,
    signal,
    credentials: "same-origin",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Workspace-Id": workspaceId,
    },
  });
}

function normalizeErrorCode(code, status) {
  const byStatus = {
    401: "SESSION_EXPIRED",
    403: "WORKSPACE_ACCESS_DENIED",
    413: "FILE_TOO_LARGE",
    415: "UNSUPPORTED_FILE",
    422: "INVALID_UPLOAD",
    429: "OCR_RATE_LIMIT",
    502: "OCR_PROVIDER_UNAVAILABLE",
    503: "OCR_PROVIDER_UNAVAILABLE",
  };
  return byStatus[status] || code || "OCR_FAILED";
}

function safeResponseMessage(status, backendMessage) {
  const messages = {
    401: "Your session has expired. Sign in again to continue.",
    403: "You do not have access to use OCR in this workspace.",
    413: "The selected document exceeds the upload size limit.",
    415: "This document type is not supported.",
    422: "The uploaded document could not be validated.",
    429: "OCR is temporarily rate limited. Wait a moment and retry.",
    502: "The OCR provider is temporarily unavailable.",
    503: "The OCR provider is temporarily unavailable.",
  };
  return messages[status] || backendMessage || "Document extraction failed. Please retry.";
}
