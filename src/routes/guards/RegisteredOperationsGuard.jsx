import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { hasRegisteredOperationsAccess, isRegisteredOperationEnabled } from "../../config/groupManagerSafety";

export default function RegisteredOperationsGuard({ children, operation = "REGISTERED_OPERATIONS" }) {
  const location = useLocation();
  const { permissions, profile, role } = useAuth();
  if (!isRegisteredOperationEnabled(operation) || !hasRegisteredOperationsAccess({ permissions, profile, role })) {
    return <Navigate to="/chits/manual-records" replace state={{
      featureNotice: "Advanced registered operations are not enabled for this workspace.",
      blockedPath: location.pathname,
    }} />;
  }
  return children;
}
