export const REPOSITORY_BACKENDS = Object.freeze({ LOCAL: "local", SUPABASE: "supabase" });

export class RepositoryConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "RepositoryConfigurationError";
  }
}

export function resolveRepositoryBackend(env = import.meta.env) {
  const safeEnv = env || {};
  const mode = String(safeEnv.VITE_APP_MODE || safeEnv.MODE || "development").toLowerCase();
  const configured = String(safeEnv.VITE_REPOSITORY_BACKEND || "").toLowerCase();
  const production = mode === "production" || mode === "prod";
  const backend = configured || (production ? REPOSITORY_BACKENDS.SUPABASE : REPOSITORY_BACKENDS.LOCAL);

  if (!Object.values(REPOSITORY_BACKENDS).includes(backend)) {
    throw new RepositoryConfigurationError(`Unsupported repository backend: ${backend}`);
  }
  if (production && backend !== REPOSITORY_BACKENDS.SUPABASE) {
    throw new RepositoryConfigurationError("Production mode requires the Supabase repository backend; localStorage fallback is disabled.");
  }
  if (backend === REPOSITORY_BACKENDS.SUPABASE && (!safeEnv.VITE_SUPABASE_URL || !safeEnv.VITE_SUPABASE_ANON_KEY)) {
    throw new RepositoryConfigurationError("Supabase repository mode requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  return backend;
}

export function selectRepository({ local, supabase, env = import.meta.env }) {
  return resolveRepositoryBackend(env) === REPOSITORY_BACKENDS.SUPABASE ? supabase : local;
}
