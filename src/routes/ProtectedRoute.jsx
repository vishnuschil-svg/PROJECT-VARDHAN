import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { DEV_AUTH_BYPASS } from "../config/devAccess";

function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  // Development bypass - allow access to protected pages
  if (DEV_AUTH_BYPASS && user) {
    return children;
  }

  if (!user) return <Navigate to="/login" replace />;

  if (profile?.status !== "approved") {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
