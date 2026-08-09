export const SOFTWARE_PROVIDER = "VARDHAN SOFTWARE SOLUTIONS";
export const PRODUCT_NAME = "VARDHAN Group Manager";

export const REGISTERED_OPERATION_PERMISSIONS = Object.freeze({
  ACCESS: "REGISTERED_OPERATIONS_ACCESS",
  AUCTION: "AUTOMATED_AUCTION_ACCESS",
  DRAW: "AUTOMATED_DRAW_ACCESS",
});

export function resolveRegisteredOperationsFlags(env = import.meta.env || {}) {
  const registered = readExplicitTrue(env.VITE_REGISTERED_OPERATIONS_ENABLED);
  return Object.freeze({
    REGISTERED_OPERATIONS_ENABLED: registered,
    AUTOMATED_AUCTION_ENABLED: registered && readExplicitTrue(env.VITE_AUTOMATED_AUCTION_ENABLED),
    AUTOMATED_LUCKY_DRAW_ENABLED: registered && readExplicitTrue(env.VITE_AUTOMATED_LUCKY_DRAW_ENABLED),
    AUTOMATED_WINNER_SELECTION_ENABLED: registered && readExplicitTrue(env.VITE_AUTOMATED_WINNER_SELECTION_ENABLED),
  });
}

export const REGISTERED_OPERATION_FLAGS = resolveRegisteredOperationsFlags();
export const {
  REGISTERED_OPERATIONS_ENABLED,
  AUTOMATED_AUCTION_ENABLED,
  AUTOMATED_LUCKY_DRAW_ENABLED,
  AUTOMATED_WINNER_SELECTION_ENABLED,
} = REGISTERED_OPERATION_FLAGS;

export const DECISION_SOURCE = "EXTERNAL_ORGANIZER_DECISION";
export const RECORD_SOURCE = "MANUAL_ORGANIZER_ENTRY";
export const DECLARATION_VERSION = "group-manager-v1-2026-08-09";

export const COMPLIANCE_DECLARATION =
  "I independently operate and control my group activities and am solely responsible for obtaining any registrations, sanctions, permissions or approvals required by applicable law. VARDHAN SOFTWARE SOLUTIONS only provides technology and record-management software and does not operate the group, conduct bidding, select recipients, collect member funds, distribute funds or guarantee payments.";

export const PRODUCT_DISCLAIMER =
  "VARDHAN SOFTWARE SOLUTIONS provides technology and record-management software only. Group operations, member participation, collections, selections, distributions, payments and statutory compliance are independently managed by the respective organizer.";

export const RECEIPT_DISCLAIMER =
  "Payment recorded by the respective organizer. VARDHAN SOFTWARE SOLUTIONS provides technology and record-management software only and does not receive, hold or disburse member funds.";

export const PROHIBITED_MARKETING_CLAIMS = Object.freeze([
  "Run unregistered chits",
  "No registration required",
  "Avoid Registrar",
  "Government approved",
  "VARDHAN verified chit",
  "100% legally compliant",
  "Guaranteed payout",
  "Guaranteed returns",
  "We conduct your auction",
  "We select the winner",
]);

export const GROUP_MANAGER_PERMISSIONS = Object.freeze({
  MANUAL_BID_RECORD_CREATE: "MANUAL_BID_RECORD_CREATE",
  MANUAL_BID_RECORD_EDIT: "MANUAL_BID_RECORD_EDIT",
  DISTRIBUTION_RECORD_CREATE: "DISTRIBUTION_RECORD_CREATE",
  DISTRIBUTION_RECORD_EDIT: "DISTRIBUTION_RECORD_EDIT",
  PAYMENT_DETAILS_MANAGE: "PAYMENT_DETAILS_MANAGE",
  LEGAL_SETTINGS_MANAGE: "LEGAL_SETTINGS_MANAGE",
  COMPLIANCE_CASE_MANAGE: "COMPLIANCE_CASE_MANAGE",
});

export function canAccessRegisteredOperations() {
  return REGISTERED_OPERATIONS_ENABLED;
}

export class RegisteredOperationsDisabledError extends Error {
  constructor(operation = "REGISTERED_OPERATIONS") {
    super("Advanced registered operations are not enabled for this workspace.");
    this.name = "RegisteredOperationsDisabledError";
    this.code = "REGISTERED_OPERATIONS_DISABLED";
    this.operation = operation;
  }
}

export function assertRegisteredOperationEnabled(operation, flags = REGISTERED_OPERATION_FLAGS) {
  if (!isRegisteredOperationEnabled(operation, flags)) {
    throw new RegisteredOperationsDisabledError(operation);
  }
  return true;
}

export function isRegisteredOperationEnabled(operation, flags = REGISTERED_OPERATION_FLAGS) {
  const childEnabled = operation === "AUTOMATED_AUCTION"
    ? flags.AUTOMATED_AUCTION_ENABLED
    : operation === "AUTOMATED_LUCKY_DRAW"
      ? flags.AUTOMATED_LUCKY_DRAW_ENABLED
      : operation === "AUTOMATED_WINNER_SELECTION"
        ? flags.AUTOMATED_WINNER_SELECTION_ENABLED
        : flags.REGISTERED_OPERATIONS_ENABLED;
  return Boolean(flags.REGISTERED_OPERATIONS_ENABLED && childEnabled);
}

export function hasRegisteredOperationsAccess({ permissions = {}, profile = {}, role = "" } = {}, flags = REGISTERED_OPERATION_FLAGS) {
  if (!flags.REGISTERED_OPERATIONS_ENABLED) return false;
  const roleKey = String(role?.key || role?.code || role?.name || role || profile?.role || profile?.role_name || "").toUpperCase();
  const platformAuthorized = permissions?.isPlatformOwner === true || profile?.is_platform_owner === true || ["PLATFORM_OWNER", "SUPER_ADMIN"].includes(roleKey);
  const reservedPermission = permissions?.features?.[REGISTERED_OPERATION_PERMISSIONS.ACCESS] === true || permissions?.[REGISTERED_OPERATION_PERMISSIONS.ACCESS] === true;
  return platformAuthorized || reservedPermission;
}

export function assertRegisteredOperationsAccess(context = {}, operation = "REGISTERED_OPERATIONS", flags = REGISTERED_OPERATION_FLAGS) {
  assertRegisteredOperationEnabled(operation, flags);
  if (!hasRegisteredOperationsAccess(context, flags)) {
    const error = new Error("Platform authorization is required for advanced registered operations.");
    error.code = "REGISTERED_OPERATIONS_UNAUTHORIZED";
    throw error;
  }
  return true;
}

function readExplicitTrue(value) {
  return String(value || "").trim().toLowerCase() === "true";
}
