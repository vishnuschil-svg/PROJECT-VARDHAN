import { createContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { DEV_AUTH_BYPASS, DEV_MOCK_DATA } from "../config/devAccess";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [company, setCompany] = useState(null);
  const [role, setRole] = useState(null);
  const [modules, setModules] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadUser() {
    // Development bypass mode
    if (DEV_AUTH_BYPASS) {
      console.log("[DEV MODE] Auth bypass enabled - using mock data");
      setUser(DEV_MOCK_DATA.user);
      setProfile(DEV_MOCK_DATA.profile);
      setCompany(DEV_MOCK_DATA.company);
      setRole(DEV_MOCK_DATA.role);
      setModules(DEV_MOCK_DATA.modules);
      setLoading(false);
      return;
    }

    const { data } = await supabase.auth.getUser();

    const currentUser = data.user;

    setUser(currentUser);

    if (currentUser) {

      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      setProfile(profileData);

    }

    setLoading(false);

  }

  useEffect(() => {

    loadUser();

    // Only set up listener if not in dev bypass mode
    if (!DEV_AUTH_BYPASS) {
      const { data: listener } = supabase.auth.onAuthStateChange(() => {
        loadUser();
      });

      return () => listener.subscription.unsubscribe();
    }

  }, []);

  return (

    <AuthContext.Provider
      value={{
        user,
        profile,
        company,
        role,
        modules,
        loading,
        loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>

  );

}
