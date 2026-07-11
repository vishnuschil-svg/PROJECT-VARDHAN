import { LicenseEngine } from "../licensing/LicenseEngine";
import { LicenseRepository } from "../repositories/LicenseRepository";

export function getLicenseState({ workspace, permissionSet } = {}) {
  const snapshot = LicenseRepository.getLicenseSnapshot(workspace);
  const license = LicenseEngine.buildLicense({
    subscription: snapshot.subscription,
    workspace: snapshot.workspace,
    permissionSet,
  });

  return {
    ...license,
    product: snapshot.product,
    productId: snapshot.productId,
    supportedModules: snapshot.supportedModules,
  };
}

export function getLicenseDashboardSummary({ workspace, permissionSet } = {}) {
  const license = getLicenseState({ workspace, permissionSet });
  const seatUsageRate = license.seats ? Math.round((license.usedSeats / license.seats) * 100) : 0;

  return {
    currentLicense: `${license.licenseType} - ${license.planName}`,
    status: license.status,
    statusTone: license.isValid ? "success" : "warning",
    daysRemaining: formatDaysRemaining(license.daysRemaining),
    expiresOn: license.expiresOn || "Not set",
    seats: `${license.usedSeats}/${license.seats}`,
    seatUsageRate,
    featureAvailability: license.featureAvailability,
    productName: license.product?.productName || "Workspace module",
    supportedModules: license.supportedModules,
    isValid: license.isValid,
  };
}

function formatDaysRemaining(daysRemaining) {
  if (daysRemaining === "Lifetime" || daysRemaining === Number.MAX_SAFE_INTEGER) {
    return "Lifetime";
  }

  return `${Math.max(0, Number(daysRemaining || 0))} days`;
}
