import test from "node:test";
import assert from "node:assert/strict";
import {
  DURABLE_APP_MODES,
  RepositoryConfigurationError,
  getRepositoryStartupSnapshot,
  resolveRepositoryBackend,
} from "../../config/repositoryBackend.js";

test("local/demo may use local repositories when explicitly selected", () => {
  assert.equal(
    resolveRepositoryBackend({
      VITE_APP_MODE: "demo",
      VITE_REPOSITORY_BACKEND: "local",
    }),
    "local"
  );
  assert.equal(
    resolveRepositoryBackend({
      VITE_APP_MODE: "development",
      VITE_REPOSITORY_BACKEND: "local",
    }),
    "local"
  );
});

test("trial/staging/production cannot silently use local repositories", () => {
  for (const mode of DURABLE_APP_MODES) {
    assert.throws(
      () =>
        resolveRepositoryBackend({
          VITE_APP_MODE: mode,
          VITE_REPOSITORY_BACKEND: "local",
          VITE_SUPABASE_URL: "https://example.supabase.co",
          VITE_SUPABASE_ANON_KEY: "anon",
        }),
      RepositoryConfigurationError
    );
  }
});

test("missing supabase config fails safely in durable mode", () => {
  assert.throws(
    () =>
      resolveRepositoryBackend({
        VITE_APP_MODE: "trial",
        VITE_REPOSITORY_BACKEND: "supabase",
      }),
    /VITE_SUPABASE_URL/
  );
});

test("trial mode selects supabase when configured", () => {
  assert.equal(
    resolveRepositoryBackend({
      VITE_APP_MODE: "trial",
      VITE_REPOSITORY_BACKEND: "supabase",
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_ANON_KEY: "anon",
    }),
    "supabase"
  );
});

test("startup snapshot never includes secrets", () => {
  const snapshot = getRepositoryStartupSnapshot({
    VITE_APP_MODE: "trial",
    VITE_REPOSITORY_BACKEND: "supabase",
    VITE_PLATFORM_API_URL: "/api",
    VITE_SUPABASE_URL: "https://example.supabase.co",
    VITE_SUPABASE_ANON_KEY: "super-secret-anon-key",
  });
  const serialized = JSON.stringify(snapshot);
  assert.equal(snapshot.supabaseConfigured, "yes");
  assert.equal(snapshot.repositoryBackend, "supabase");
  assert.doesNotMatch(serialized, /super-secret-anon-key/);
  assert.doesNotMatch(serialized, /service_role|SERVICE_ROLE/i);
});
