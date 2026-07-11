export const LICENSE_TYPES = {
  FOUNDER: "FOUNDER",
  TRIAL: "TRIAL",
  LIFETIME: "LIFETIME",
  MONTHLY: "MONTHLY",
  YEARLY: "YEARLY",
  ENTERPRISE: "ENTERPRISE",
};

export const LicenseValidator = {
  validate(subscription = {}) {
    const daysRemaining = getDaysRemaining(subscription.expiresOn);
    const isLifetime = String(subscription.expiresOn || "").toLowerCase() === "lifetime";
    const status = String(subscription.status || "none").toLowerCase();
    const isValid = ["active", "trial"].includes(status) && (isLifetime || daysRemaining >= 0);

    return {
      isValid,
      status: isValid ? "Valid" : "Invalid",
      daysRemaining: isLifetime ? "Lifetime" : daysRemaining,
      expiresOn: subscription.expiresOn || "",
      reason: isValid ? "License active" : "License expired or inactive",
    };
  },
};

function getDaysRemaining(expiresOn) {
  if (!expiresOn) {
    return 0;
  }

  if (String(expiresOn).toLowerCase() === "lifetime") {
    return Number.MAX_SAFE_INTEGER;
  }

  const difference = new Date(expiresOn).getTime() - Date.now();
  return Math.ceil(difference / 86400000);
}
