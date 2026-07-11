export const SubscriptionEngine = {
  buildSubscriptionState(subscription = {}, validation = {}) {
    return {
      id: subscription.id || "",
      status: subscription.status || "none",
      licenseKey: subscription.licenseKey || "",
      startsOn: subscription.startsOn || "",
      expiresOn: subscription.expiresOn || "",
      isActive: validation.isValid,
      daysRemaining: validation.daysRemaining,
    };
  },
};
