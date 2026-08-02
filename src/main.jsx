import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./styles/theme.css";
import "./styles/vds.css";
import "./styles/access.css";
import "./styles/product-polish.css";
import "./styles/vardhan-brand.css";
import AppRouter from "./routes/AppRouter";
import { AuthProvider } from "./contexts/AuthContext";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LocaleProvider } from "./contexts/LocaleContext";
import DevBanner from "./components/common/DevBanner";
import { runInternalTrialBusinessDataCleanup } from "./services/internalTrialCleanupService";
import { resolveRepositoryBackend, getRepositoryStartupSnapshot } from "./config/repositoryBackend.js";
import { isSupabaseConfigured } from "./lib/supabase/SupabaseClient.js";
import { initializeApplicationMonitoring } from "./lib/monitoring/initializeMonitoring.js";

const repositoryBackend = resolveRepositoryBackend();
const startup = getRepositoryStartupSnapshot();

if (import.meta.env.DEV) {
  // Development-only configuration banner — never logs secrets.
  console.info(
    "[VARDHAN startup]",
    `appMode=${startup.appMode}`,
    `repositoryBackend=${startup.repositoryBackend}`,
    `apiBaseUrl=${startup.apiBaseUrl}`,
    `supabaseConfigured=${startup.supabaseConfigured}`
  );
}

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
