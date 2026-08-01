import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./styles/theme.css";
import "./styles/vds.css";
import AppRouter from "./routes/AppRouter";
import { AuthProvider } from "./contexts/AuthContext";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LocaleProvider } from "./contexts/LocaleContext";
import "./styles/access.css";
import "./styles/product-polish.css";
import DevBanner from "./components/common/DevBanner";
import { runInternalTrialBusinessDataCleanup } from "./services/internalTrialCleanupService";
import { resolveRepositoryBackend } from "./config/repositoryBackend.js";
import { isSupabaseConfigured } from "./lib/supabase/SupabaseClient.js";
import { initializeApplicationMonitoring } from "./lib/monitoring/initializeMonitoring.js";

const repositoryBackend = resolveRepositoryBackend();
initializeApplicationMonitoring({
  repositoryBackend,
  appMode: import.meta.env.VITE_APP_MODE || import.meta.env.MODE,
  supabaseConfigured: isSupabaseConfigured,
});
runInternalTrialBusinessDataCleanup();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <DevBanner />
            <AppRouter />
          </WorkspaceProvider>
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  </React.StrictMode>
);
