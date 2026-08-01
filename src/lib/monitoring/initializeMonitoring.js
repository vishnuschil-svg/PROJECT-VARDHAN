import { getHealthChecker } from "./HealthChecker.js";
import { getLogger } from "./Logger.js";
import { getMetricsCollector } from "./MetricsCollector.js";

export function initializeApplicationMonitoring({ repositoryBackend, appMode, supabaseConfigured }) {
  const health = getHealthChecker();
  const logger = getLogger();
  const metrics = getMetricsCollector();
  const production = ["production", "prod"].includes(String(appMode || "").toLowerCase());

  health.registerCheck("application_configuration", async () => ({
    appMode: appMode || "development",
    repositoryBackend,
  }), { critical: true, description: "Application configuration is valid." });

  health.registerCheck("authentication_configuration", async () => {
    if (production && !supabaseConfigured) throw new Error("Supabase Auth is not configured");
    return { provider: supabaseConfigured ? "supabase" : "local_trial" };
  }, { critical: production, description: "Authentication provider configuration is present." });

  health.registerCheck("storage_configuration", async () => {
    if (!supabaseConfigured) throw new Error("Private storage is not configured");
    return { provider: "supabase", connectivityVerified: false };
  }, { critical: production, description: "Storage configuration is present; connectivity requires staging verification." });

  metrics.incrementCounter("application_starts_total", 1, { mode: production ? "production" : "local" });
  logger.info("Application monitoring initialized", { app_mode: appMode, repository_backend: repositoryBackend });
  return { health, logger, metrics };
}
