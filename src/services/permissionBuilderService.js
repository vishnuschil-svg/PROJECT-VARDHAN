import { RolePermissionRepository } from "../repositories/RolePermissionRepository.js";

export const PERMISSION_ACTIONS = ["VIEW", "CREATE", "EDIT", "DELETE_OR_CANCEL", "APPROVE", "EXPORT", "PRINT", "SHARE", "CLOSE_PERIOD", "REOPEN_PERIOD", "OVERRIDE", "MANAGE_PERMISSIONS"];
export const PERMISSION_RESOURCES = ["DASHBOARD", "BATCHES", "GROUPS", "MEMBERS", "COLLECTIONS", "PENDING", "AUCTIONS", "LUCKY_DRAW", "PAYOUTS", "RECEIPTS", "LEDGER", "FINANCE", "EXPENSES", "INVESTORS", "REPORTS", "IMPORT", "AI_STUDIO", "TEMPLATES", "SETTINGS", "COMMUNICATION", "AUDIT"];

export function buildPermissionMatrix(defaultAllowed = false) {
  return Object.fromEntries(PERMISSION_RESOURCES.map((resource) => [
    resource,
    Object.fromEntries(PERMISSION_ACTIONS.map((action) => [action, defaultAllowed])),
  ]));
}

export function saveCustomRole(role, activeTenantContext) {
  return RolePermissionRepository.save({
    ...role,
    permissionMatrix: role.permissionMatrix || buildPermissionMatrix(false),
    status: role.status || "ACTIVE",
    updatedAt: new Date().toISOString(),
  }, activeTenantContext);
}

export function canPerform(role, resource, action) {
  return Boolean(role?.permissionMatrix?.[resource]?.[action]);
}
