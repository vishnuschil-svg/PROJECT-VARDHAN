export const REPOSITORY_BACKENDS = Object.freeze({ LOCAL: "local", SUPABASE: "supabase" });

/** Modes that must use durable Supabase persistence — never silent localStorage. */
export const DURABLE_APP_MODES = Object.freeze(["production", "prod", "staging", "trial"]);

export class RepositoryConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "RepositoryConfigurationError";
  }
}

export function resolveAppMode(env = import.meta.env) {
  const safeEnv = env || {};
  return String(safeEnv.VITE_APP_MODE || safeEnv.MODE || "development").toLowerCase();
}

export function isDurableAppMode(env = import.meta.env) {
  return DURABLE_APP_MODES.includes(resolveAppMode(env));
}

export function resolveRepositoryBackend(env = import.meta.env) {
  const safeEnv = env || {};
  const mode = resolveAppMode(safeEnv);
  const configured = String(safeEnv.VITE_REPOSITORY_BACKEND || "").toLowerCase();
  const durable = DURABLE_APP_MODES.includes(mode);
  const backend = configured || (durable ? REPOSITORY_BACKENDS.SUPABASE : REPOSITORY_BACKENDS.LOCAL);

  if (!Object.values(REPOSITORY_BACKENDS).includes(backend)) {
    throw new RepositoryConfigurationError(`Unsupported repository backend: ${backend}`);
  }
  if (durable && backend !== REPOSITORY_BACKENDS.SUPABASE) {
    throw new RepositoryConfigurationError(
      `${mode} mode requires VITE_REPOSITORY_BACKEND=supabase. Local/demo repositories are disabled.`
    );
  }
  if (backend === REPOSITORY_BACKENDS.SUPABASE && (!safeEnv.VITE_SUPABASE_URL || !safeEnv.VITE_SUPABASE_ANON_KEY)) {
    throw new RepositoryConfigurationError(
      "Supabase repository mode requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
    );
  }
  return backend;
}

export function selectRepository({ local, supabase, env = import.meta.env }) {
  return resolveRepositoryBackend(env) === REPOSITORY_BACKENDS.SUPABASE ? supabase : local;
}

/**
 * Dev-only startup snapshot. Never include keys or secrets.
 */
export function getRepositoryStartupSnapshot(env = import.meta.env) {
  const safeEnv = env || {};
  const appMode = resolveAppMode(safeEnv);
  const repositoryBackend = resolveRepositoryBackend(safeEnv);
  const apiBase = String(safeEnv.VITE_PLATFORM_API_URL || "/api");
  const supabaseConfigured = Boolean(safeEnv.VITE_SUPABASE_URL && safeEnv.VITE_SUPABASE_ANON_KEY);
  return {
    appMode,
    repositoryBackend,
    apiBaseUrl: apiBase,
    supabaseConfigured: supabaseConfigured ? "yes" : "no",
    durableMode: DURABLE_APP_MODES.includes(appMode),
  };
}
