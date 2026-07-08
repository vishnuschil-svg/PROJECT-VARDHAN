import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  evaluateModuleRoute,
  evaluatePermissionRoute,
  evaluatePlatformRoute,
  evaluateProtectedRoute,
} from "./guards/routeGuards";

function ProtectedRoute({ children, moduleId, platformOnly = false, permission }) {
  const { user, profile, role, modules, permissions, loading } = useAuth();
  const protectedResult = evaluateProtectedRoute({ user, profile, role, loading });

  if (protectedResult.loading) return <div style={{ padding: 40 }}>Loading...</div>;

  if (protectedResult.redirectTo) {
    return <Navigate to={protectedResult.redirectTo} replace />;
  }

  const platformResult = evaluatePlatformRoute({ platformOnly, profile, role });

  if (platformResult.redirectTo) {
    return <Navigate to={platformResult.redirectTo} replace />;
  }

  const moduleResult = evaluateModuleRoute({ moduleId, modules, profile, role });

  if (moduleResult.redirectTo) {
    return <Navigate to={moduleResult.redirectTo} replace />;
  }

  const permissionResult = evaluatePermissionRoute({
    action: permission,
    moduleId,
    permissions,
    profile,
    role,
    modules,
  });

  if (permissionResult.redirectTo) {
    return <Navigate to={permissionResult.redirectTo} replace />;
  }

  return children;
}

export default ProtectedRoute;
