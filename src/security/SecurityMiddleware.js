import { FeatureGate } from "./FeatureGate";

export const SecurityMiddleware = {
  authorize({ permission, securityContext }) {
    const permissionSet = securityContext?.roleProfile?.permissions || {};
    const license = securityContext?.license || {};

    return FeatureGate.evaluateFeature(permission, {
      permissions: permissionSet,
      license,
    });
  },

  requireAuthorization({ permission, securityContext }) {
    const result = this.authorize({ permission, securityContext });

    if (!result.allowed) {
      return {
        allowed: false,
        status: 403,
        message: result.reason,
      };
    }

    return {
      allowed: true,
      status: 200,
      message: "Allowed",
    };
  },
};
