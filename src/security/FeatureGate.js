export const FeatureGate = {
  evaluateFeature(featureKey, { permissions = {}, license = {} } = {}) {
    const permissionAllowed = featureKey ? Boolean(permissions[featureKey]) : true;
    const licenseAllowed = featureKey ? Boolean(license.features?.[featureKey]) : true;

    return {
      featureKey,
      allowed: permissionAllowed && licenseAllowed && license.isValid !== false,
      permissionAllowed,
      licenseAllowed,
      reason: getReason({ permissionAllowed, licenseAllowed, license }),
    };
  },

  evaluateFeatures(featureKeys = [], context = {}) {
    return featureKeys.map((featureKey) => this.evaluateFeature(featureKey, context));
  },
};

function getReason({ permissionAllowed, licenseAllowed, license }) {
  if (license.isValid === false) return "License inactive";
  if (!permissionAllowed) return "Permission restricted";
  if (!licenseAllowed) return "Plan restricted";
  return "Available";
}
