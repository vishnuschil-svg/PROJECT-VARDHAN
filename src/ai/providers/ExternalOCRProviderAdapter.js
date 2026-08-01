import { getSupabaseClient } from "../../lib/supabase/SupabaseClient.js";
import { SupabaseAuthService } from "../../services/auth/SupabaseAuthService.js";

const DEFAULT_TIMEOUT_MS = 30000;
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
  getAccessToken = SupabaseAuthService.getAccessToken,
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
    } = {}) {
      // Remove isConfigured() check to ensure POST request always reaches backend
      // Backend will handle configuration errors
      validateFile(file);
      const session = await sessionLoader();
      console.log("[OCR Request] Session retrieved:", session ? "Session exists" : "No session");
      console.log("[OCR Request] Access token exists:", !!session?.access_token);
      if (!session?.access_token) {
        throw new OCRProviderError(
          "OCR_NOT_CONFIGURED",
          "An authenticated session is required for document extraction."
        );
      }
      if (!workspaceId) {
        throw new OCRProviderError(
          "OCR_NOT_CONFIGURED",
          "Select a business workspace before extracting a document."
        );
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        console.log("[OCR Request] Calling backend endpoint:", normalizedEndpoint);
        console.log("[OCR Request] File:", file.name, file.type, file.size);
        console.log("[OCR Request] Workspace ID:", workspaceId);
        const body = new FormData();
        body.append("file", file, file.name);
        body.append("document_type", documentType);
        body.append("language_hint", languageHint);
        const response = await fetchImpl(normalizedEndpoint, {
          method: "POST",
          body,
          signal: controller.signal,
          credentials: "same-origin",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "X-Workspace-Id": workspaceId,
          },
        });
        console.log("[OCR Request] Response status:", response.status);
        const result = await readJsonSafely(response);
        if (!response.ok) {
          const detail = result?.detail && typeof result.detail === "object"
            ? result.detail
            : result;
          const backendMessage = typeof result?.detail === "string"
            ? result.detail
            : detail?.message;
          throw new OCRProviderError(
            detail?.code || "OCR_FAILED",
            backendMessage || `Document extraction failed with status ${response.status}.`,
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
  console.log("[defaultSession] Using SupabaseAuthService for session retrieval");
  try {
    const session = await SupabaseAuthService.getSession();
    console.log("[defaultSession] Session from auth service:", session ? "Session exists" : "No session");
    // The auth service returns a formatted session, we need to extract the raw Supabase session
    const rawSession = session?.session;
    console.log("[defaultSession] Raw Supabase session:", rawSession ? "Raw session exists" : "No raw session");
    console.log("[defaultSession] Access token:", rawSession?.access_token ? "Token exists" : "No token");
    return rawSession;
  } catch (error) {
    console.error("[defaultSession] Error getting session from auth service:", error);
    // Fallback to direct Supabase client
    const client = getSupabaseClient();
    console.log("[defaultSession] Fallback to direct Supabase client:", client ? "Client exists" : "No client");
    if (!client) return null;
    const session = (await client.auth.getSession()).data.session;
    console.log("[defaultSession] Fallback session:", session ? "Session exists" : "No session");
    console.log("[defaultSession] Fallback access token:", session?.access_token ? "Token exists" : "No token");
    return session;
  }
}

function validateFile(file) {
  if (!file?.name || typeof file.size !== "number") {
    throw new OCRProviderError("OCR_FAILED", "A valid OCR document is required.");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new OCRProviderError("OCR_FAILED", "OCR document exceeds the 15 MB safety limit.");
  }
  if (file.type && !SUPPORTED_TYPES.has(file.type)) {
    throw new OCRProviderError(
      "OCR_FAILED",
      "OCR supports JPEG, PNG, WebP, and PDF documents only."
    );
  }
}
