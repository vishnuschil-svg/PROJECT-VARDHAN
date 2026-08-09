import { hasRegisteredOperationsAccess, isRegisteredOperationEnabled } from "../../config/groupManagerSafety.js";

export const FEATURE_BANK_REGISTERED_OPERATIONS_MENU = Object.freeze([
  { label: "Auctions", icon: "AO", path: "/chits/auctions", registeredOnly: true, operation: "AUTOMATED_AUCTION" },
  { label: "Lucky Draw", icon: "LD", path: "/chits/lucky-draw", registeredOnly: true, operation: "AUTOMATED_LUCKY_DRAW" },
  { label: "Payout Operations", icon: "PO", path: "/chits/payouts", registeredOnly: true, operation: "REGISTERED_OPERATIONS" },
]);

export const ALL_CHIT_MENU = Object.freeze([
  { label: "Dashboard", icon: "DB", path: "/chits" },
  { label: "Groups", icon: "GR", path: "/chits/groups" },
  { label: "Members", icon: "MB", path: "/chits/members" },
  { label: "Collections", icon: "CL", path: "/chits/collections" },
  { label: "Pending", icon: "PN", path: "/chits/collections/pending" },
  { label: "Receipts", icon: "RC", path: "/chits/receipts" },
  { label: "Ledger", icon: "LG", path: "/chits/member-ledger" },
  { label: "Manual Records", icon: "MR", path: "/chits/manual-records" },
  { label: "Distributions", icon: "DR", path: "/chits/distributions" },
  { label: "Expenses", icon: "EX", path: "/chits/finance" },
  { label: "Reports", icon: "RP", path: "/chits/reports" },
  { label: "AI Assistant", icon: "AI", path: "/chits/ai" },
  { label: "Settings", icon: "ST", path: "/chits/settings" },
  ...FEATURE_BANK_REGISTERED_OPERATIONS_MENU,
]);

export function getChitMenu(accessContext = {}) {
  const registeredAllowed = hasRegisteredOperationsAccess(accessContext);
  return ALL_CHIT_MENU.filter((item) => !item.registeredOnly || (registeredAllowed && isRegisteredOperationEnabled(item.operation)));
}

export const CHIT_MENU = getChitMenu();
