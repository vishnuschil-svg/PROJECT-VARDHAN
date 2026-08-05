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
          const code = normalizeErrorCode(detail?.code, response.status);
          const retryable = Boolean(detail?.retryable || response.status === 429 || response.status >= 500);
          logOcrFailure({
            endpoint: normalizedEndpoint,
            status: response.status,
            code,
            retryable,
          });
          throw new OCRProviderError(
            code,
            safeResponseMessage(response.status, backendMessage, code),
            {
              status: response.status,
              retryable,
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
  const hasRawText = typeof result.rawText === "string" && result.rawText.trim().length > 0;
  if (!hasExtractedValue && !hasRawText) {
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
  const status = Number(response.status || 0);
  if (contentType && !contentType.toLowerCase().includes("json")) {
    if (status === 504) {
      throw new OCRProviderError(
        "OCR_TIMEOUT",
        "The OCR backend timed out. Retry after the backend is healthy.",
        { status, retryable: true }
      );
    }
    if (status >= 500 || status === 0) {
      throw new OCRProviderError(
        "OCR_PROVIDER_UNAVAILABLE",
        "The OCR backend is unavailable. Start the VARDHAN full development server and retry.",
        { status, retryable: true }
      );
    }
    throw new OCRProviderError(
      "OCR_SCHEMA_INVALID",
      "Document extraction service returned a non-JSON response.",
      { status }
    );
  }
  try {
    return await response.json();
  } catch (error) {
    if (status >= 500 || status === 0) {
      throw new OCRProviderError(
        "OCR_PROVIDER_UNAVAILABLE",
        "The OCR backend returned an unreadable gateway response. Retry after the backend is healthy.",
        { status, retryable: true, cause: error }
      );
    }
    throw new OCRProviderError(
      "OCR_SCHEMA_INVALID",
      "Document extraction service returned invalid JSON.",
      { status, cause: error }
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
  // Prefer the backend domain code when it is a known OCR contract value.
  // Do not collapse OCR_NOT_CONFIGURED / OCR_SCHEMA_INVALID into PROVIDER_UNAVAILABLE.
  if (typeof code === "string" && ERROR_CODES.has(code)) return code;
  const byStatus = {
    401: "SESSION_EXPIRED",
    403: "WORKSPACE_ACCESS_DENIED",
    413: "FILE_TOO_LARGE",
    415: "UNSUPPORTED_FILE",
    422: "INVALID_UPLOAD",
    429: "OCR_RATE_LIMIT",
    502: "OCR_PROVIDER_UNAVAILABLE",
    503: "OCR_PROVIDER_UNAVAILABLE",
    504: "OCR_TIMEOUT",
  };
  return byStatus[status] || "OCR_FAILED";
}

function safeResponseMessage(status, backendMessage, code) {
  const byCode = {
    OCR_NOT_CONFIGURED: "Document extraction is not configured for this environment. Enter details manually or contact support.",
    OCR_TIMEOUT: "Document extraction timed out. Retry once, or enter the visible text manually.",
    OCR_RATE_LIMIT: "OCR is temporarily rate limited. Wait a moment and retry.",
    OCR_PROVIDER_UNAVAILABLE: "The OCR provider is temporarily unavailable. Retry, or enter details manually.",
    OCR_SCHEMA_INVALID: "The OCR provider returned an unreadable response. Retry, or enter details manually.",
    DOCUMENT_UNREADABLE: "No usable chit details could be read from this document. Enter the visible text manually.",
    SESSION_EXPIRED: "Your session has expired. Sign in again to continue.",
    WORKSPACE_ACCESS_DENIED: "You do not have access to use OCR in this workspace.",
    FILE_TOO_LARGE: "The selected document exceeds the upload size limit.",
    UNSUPPORTED_FILE: "This document type is not supported.",
    INVALID_UPLOAD: "The uploaded document could not be validated.",
  };
  const byStatus = {
    401: byCode.SESSION_EXPIRED,
    403: byCode.WORKSPACE_ACCESS_DENIED,
    413: byCode.FILE_TOO_LARGE,
    415: byCode.UNSUPPORTED_FILE,
    422: byCode.INVALID_UPLOAD,
    429: byCode.OCR_RATE_LIMIT,
    502: byCode.OCR_PROVIDER_UNAVAILABLE,
    503: byCode.OCR_PROVIDER_UNAVAILABLE,
    504: byCode.OCR_TIMEOUT,
  };
  const safeBackend = typeof backendMessage === "string" && backendMessage.trim() && backendMessage.length <= 280
    ? backendMessage.trim()
    : "";
  return safeBackend || byCode[code] || byStatus[status] || "Document extraction failed. Please retry.";
}

function logOcrFailure({ endpoint, status, code, retryable }) {
  try {
    console.warn("[OCR]", {
      endpoint: String(endpoint || "").replace(/([?&]key=)[^&]+/gi, "$1[REDACTED]"),
      status,
      code,
      retryable: Boolean(retryable),
    });
  } catch {
    // Never block extraction on logging failures.
  }
}
