import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { DEV_AUTH_BYPASS } from "../../config/devAccess";
import { useAuth } from "../../hooks/useAuth";
import { logoutUser } from "../../services/authService";

function Logout() {
  const { clearAuthState } = useAuth();

  useEffect(() => {
    async function signOut() {
      if (!DEV_AUTH_BYPASS) {
        await logoutUser();
      }

      clearAuthState?.();
    }

    signOut();
  }, [clearAuthState]);

  return <Navigate to="/login" replace />;
}

export default Logout;
