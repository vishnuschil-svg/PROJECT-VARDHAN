import { FeatureManager } from "./FeatureManager";
import { LicenseValidator } from "./LicenseValidator";
import { PlanManager } from "./PlanManager";
import { SubscriptionEngine } from "./SubscriptionEngine";

export const LicenseEngine = {
  buildLicense({ subscription, workspace, permissionSet = {} } = {}) {
    const plan = PlanManager.buildPlanSummary(subscription, workspace);
    const validation = LicenseValidator.validate(subscription);
    const features = FeatureManager.buildFeatureMap(plan.licenseType);

    return {
      ...plan,
      ...validation,
      subscription: SubscriptionEngine.buildSubscriptionState(subscription, validation),
      features,
      featureAvailability: FeatureManager.buildFeatureAvailability({
        licenseType: plan.licenseType,
        permissionSet,
      }),
    };
  },
};
