import { LICENSE_TYPES } from "./LicenseValidator";

export const PlanManager = {
  resolveLicenseType(subscription = {}, workspace = {}) {
    const workspaceLicense = workspace.licenseType;
    const plan = String(subscription.planType || workspace.plan || "").toUpperCase();
    const cycle = String(subscription.billingCycle || "").toUpperCase();

    if (workspaceLicense) return workspaceLicense;
    if (plan.includes("FOUNDER") || plan.includes("INTERNAL")) return LICENSE_TYPES.FOUNDER;
    if (plan.includes("TRIAL")) return LICENSE_TYPES.TRIAL;
    if (plan.includes("ENTERPRISE")) return LICENSE_TYPES.ENTERPRISE;
    if (cycle.includes("LIFETIME")) return LICENSE_TYPES.LIFETIME;
    if (cycle.includes("YEAR")) return LICENSE_TYPES.YEARLY;
    return LICENSE_TYPES.MONTHLY;
  },

  buildPlanSummary(subscription = {}, workspace = {}) {
    const licenseType = this.resolveLicenseType(subscription, workspace);

    return {
      licenseType,
      planName: subscription.planType || workspace.plan || "Standard",
      billingCycle: subscription.billingCycle || licenseType,
      seats: Number(subscription.seats || workspace.settings?.seats || 0),
      usedSeats: Number(subscription.usedSeats || workspace.activeUsers || 0),
    };
  },
};
