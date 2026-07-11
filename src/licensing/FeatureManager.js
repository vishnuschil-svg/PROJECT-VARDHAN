import { SECURITY_PERMISSIONS } from "../security/PermissionEngine";
import { LICENSE_TYPES } from "./LicenseValidator";

const PLAN_FEATURES = {
  [LICENSE_TYPES.FOUNDER]: Object.values(SECURITY_PERMISSIONS),
  [LICENSE_TYPES.ENTERPRISE]: Object.values(SECURITY_PERMISSIONS),
  [LICENSE_TYPES.LIFETIME]: Object.values(SECURITY_PERMISSIONS),
  [LICENSE_TYPES.YEARLY]: Object.values(SECURITY_PERMISSIONS),
  [LICENSE_TYPES.MONTHLY]: [
    SECURITY_PERMISSIONS.DASHBOARD,
    SECURITY_PERMISSIONS.MEMBERS,
    SECURITY_PERMISSIONS.GROUPS,
    SECURITY_PERMISSIONS.COLLECTIONS,
    SECURITY_PERMISSIONS.RECEIPTS,
    SECURITY_PERMISSIONS.FINANCE,
    SECURITY_PERMISSIONS.AUCTION,
    SECURITY_PERMISSIONS.REPORTS,
    SECURITY_PERMISSIONS.SUPPORT,
    SECURITY_PERMISSIONS.IMPORT,
    SECURITY_PERMISSIONS.EXPORT,
  ],
  [LICENSE_TYPES.TRIAL]: [
    SECURITY_PERMISSIONS.DASHBOARD,
    SECURITY_PERMISSIONS.MEMBERS,
    SECURITY_PERMISSIONS.GROUPS,
    SECURITY_PERMISSIONS.COLLECTIONS,
    SECURITY_PERMISSIONS.REPORTS,
    SECURITY_PERMISSIONS.SUPPORT,
    SECURITY_PERMISSIONS.AI,
  ],
};

export const FeatureManager = {
  buildFeatureMap(licenseType) {
    const allowed = new Set(PLAN_FEATURES[licenseType] || PLAN_FEATURES[LICENSE_TYPES.MONTHLY]);

    return Object.values(SECURITY_PERMISSIONS).reduce((features, permission) => {
      features[permission] = allowed.has(permission);
      return features;
    }, {});
  },

  buildFeatureAvailability({ licenseType, permissionSet = {} }) {
    const features = this.buildFeatureMap(licenseType);

    return Object.keys(features).map((feature) => ({
      key: feature,
      label: feature,
      available: Boolean(features[feature] && permissionSet[feature]),
      licenseAllowed: Boolean(features[feature]),
      permissionAllowed: Boolean(permissionSet[feature]),
    }));
  },
};
