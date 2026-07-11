export const SUPABASE_ERROR_MESSAGES = {
  CONFIG_MISSING: "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
  TENANT_REQUIRED: "Tenant and data scope are required.",
  NOT_FOUND: "Record not found.",
  UNKNOWN: "Supabase request failed.",
};

export function createSuccessResponse(data, message = "Success", meta = {}) {
  return {
    success: true,
    data,
    error: null,
    message,
    ...meta,
  };
}

export function createErrorResponse(error, message = SUPABASE_ERROR_MESSAGES.UNKNOWN, meta = {}) {
  return {
    success: false,
    data: null,
    error: normalizeSupabaseError(error),
    message,
    ...meta,
  };
}

export function normalizeSupabaseError(error) {
  if (!error) {
    return null;
  }

  return {
    code: error.code || "UNKNOWN",
    details: error.details || "",
    hint: error.hint || "",
    message: error.message || String(error),
  };
}

export function mapSupabaseError(error, fallbackMessage = SUPABASE_ERROR_MESSAGES.UNKNOWN) {
  if (!error) {
    return fallbackMessage;
  }

  if (error.code === "PGRST116") {
    return SUPABASE_ERROR_MESSAGES.NOT_FOUND;
  }

  return error.message || fallbackMessage;
}
