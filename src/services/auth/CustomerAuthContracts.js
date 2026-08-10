import { isPlatformOwner } from "../../config/erpModules.js";

export const ONBOARDING_STATUS = Object.freeze({
  PROFILE_PENDING: "profile_pending",
  PROFILE_READY: "profile_ready",
  COMPLETE: "complete",
});

export const PASSWORD_RECOVERY_MESSAGE =
  "If an account exists for this email, we’ve sent recovery instructions.";

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeE164(countryCode = "+91", mobile = "") {
  const prefix = String(countryCode || "+91").trim().replace(/[^+\d]/g, "");
  const raw = String(mobile || "").trim();
  const digits = raw.replace(/\D/g, "");
  const value = raw.startsWith("+") ? `+${digits}` : `${prefix.startsWith("+") ? prefix : `+${prefix}`}${digits}`;
  return /^\+[1-9]\d{7,14}$/.test(value) ? value : "";
}

export function isStrongPassword(password) {
  const value = String(password || "");
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export function validateRegistration(input = {}) {
  const fullName = String(input.fullName || "").trim();
  const businessName = String(input.businessName || "").trim();
  const email = normalizeEmail(input.email);
  const mobile = normalizeE164(input.countryCode, input.mobile);
  const errors = {};

  if (!fullName) errors.fullName = "Enter your full name.";
  if (!businessName) errors.businessName = "Enter your business name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";
  if (!mobile) errors.mobile = "Enter a valid mobile number with country code.";
  if (!isStrongPassword(input.password)) errors.password = "Use at least 8 characters with a letter and a number.";
  if (!input.acceptedTerms) errors.acceptedTerms = "Accept the Terms and Privacy Policy to continue.";

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: { fullName, businessName, email, mobile, password: String(input.password || "") },
  };
}

export function normalizeOtp(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 6);
}

export function resolvePostAuthRoute(session = {}) {
  if (!session.user) return "/login";
  if (session.requiresVerification) return "/verify-email";
  const status = session.profile?.onboarding_status || session.onboardingStatus;
  const workspaceId = session.company?.workspace_id || session.company?.workspaceId || session.activeWorkspace?.workspace_id || session.activeWorkspace?.id;
  const approvedLegacySession = session.profile?.status === "approved" && workspaceId && !status;
  if ((status === ONBOARDING_STATUS.COMPLETE && workspaceId) || approvedLegacySession) {
    return isPlatformOwner(session.profile, session.role) ? "/dashboard" : "/chits";
  }
  return "/onboarding";
}

export function toCustomerAuthMessage(error, fallback = "The request could not be completed. Try again.") {
  const message = String(error?.message || "").toLowerCase();
  const status = Number(error?.status || 0);
  if (status === 429 || message.includes("rate") || message.includes("too many")) {
    return "Too many attempts were made. Wait a moment and try again.";
  }
  if (message.includes("expired")) return "This verification code has expired. Request a new code.";
  if (message.includes("invalid") || message.includes("token")) return "Enter the latest 6-digit verification code.";
  if (message.includes("already") || message.includes("registered") || message.includes("duplicate")) {
    return "An account may already exist. Sign in, verify the pending account, or reset the password.";
  }
  if (message.includes("network") || message.includes("fetch")) return "Check your connection and try again.";
  if (message.includes("not configured") || message.includes("provider")) return "Account services are temporarily unavailable. Try again later.";
  return fallback;
}
