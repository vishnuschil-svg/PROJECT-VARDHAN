import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { HealthChecker, CommonHealthChecks } from "../../lib/monitoring/HealthChecker.js";
import { Logger } from "../../lib/monitoring/Logger.js";
import { MetricsCollector } from "../../lib/monitoring/MetricsCollector.js";

const read = (relative) => readFile(new URL(relative, import.meta.url), "utf8");

test("health checks report missing dependencies as unhealthy instead of simulated success", async () => {
  const checker = new HealthChecker();
  checker.registerCheck("database", CommonHealthChecks.databaseCheck, { critical: true });
  const result = await checker.getHealthStatus();
  assert.equal(result.status, "critical");
  assert.match(result.checks.database.message, /not configured/);
});

test("configured health checks measure the real callback", async () => {
  const result = await CommonHealthChecks.storageCheck(async () => ({ bucket: "private" }));
  assert.equal(result.connected, true);
  assert.deepEqual(result.details, { bucket: "private" });
});

test("logger redacts sensitive identifiers and supplies a correlation id", () => {
  const logger = new Logger();
  logger.getConsoleMethod = () => () => {};
  const entry = logger.info("safe event", { mobile: "9999999999", nested: { aadhaar: "1234", status: "ok" } });
  assert.equal(entry.metadata.mobile, "[REDACTED]");
  assert.equal(entry.metadata.nested.aadhaar, "[REDACTED]");
  assert.equal(entry.metadata.nested.status, "ok");
  assert.ok(entry.correlation_id);
});

test("metrics collector records counters, histograms and function failures", async () => {
  const metrics = new MetricsCollector();
  metrics.incrementCounter("requests_total", 2, { route: "health" });
  metrics.recordHistogram("latency_ms", 10);
  await assert.rejects(metrics.timeFunction("operation", async () => { throw new Error("planned"); }), /planned/);
  assert.equal(metrics.getMetrics().counters["requests_total{route=health}"], 2);
  assert.equal(metrics.getMetrics().counters.operation_error, 1);
  assert.equal(metrics.getHistogramStats("latency_ms").count, 1);
});

test("member form requires only the approved five business fields", async () => {
  const source = await read("../../pages/chits/Members.jsx");
  for (const label of ["Member Name", "Member ID / Member Number", "Mobile Number", "Assigned Chit Group", "Join Date"]) {
    assert.match(source, new RegExp(`${label.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")} is required`));
  }
  for (const label of ["WhatsApp Number", "Address", "Aadhaar Number", "Nominee Name", "Nominee Mobile", "Bank Name", "Account Number", "IFSC"]) {
    assert.doesNotMatch(source, new RegExp(`${label} is required`));
  }
});

test("manual group creation remains reachable and Chromium profiles are excluded from Vite watch", async () => {
  const [groups, vite] = await Promise.all([read("../../pages/chits/ChitGroups.jsx"), read("../../../vite.config.js")]);
  assert.match(groups, /onClick=\{openCreate\}>Create Chit Group/);
  assert.match(vite, /artifacts\/trial-browser-profile-/);
});

test("private storage code rejects public URL access", async () => {
  const [adapter, storage] = await Promise.all([
    read("../../lib/supabase/StorageAdapter.js"),
    read("../../lib/supabase/SupabaseStorage.js"),
  ]);
  assert.match(adapter, /signed = true/);
  assert.match(adapter, /Private storage does not expose public URLs/);
  assert.match(storage, /Public storage URLs are disabled/);
});

test("production auth selection uses Supabase and never logs in through a fallback", async () => {
  const [session, auth, loginPage, lowLevelAuth, storage] = await Promise.all([
    read("../../services/auth/SessionService.js"),
    read("../../services/auth/SupabaseAuthService.js"),
    read("../../pages/auth/PremiumLogin.jsx"),
    read("../../lib/supabase/SupabaseAuth.js"),
    read("../../lib/supabase/SupabaseStorage.js"),
  ]);
  assert.match(session, /useSupabase \? SupabaseAuthService : AuthService/);
  assert.doesNotMatch(auth, /falling back to demo auth/);
  assert.match(auth, /Authentication provider is unavailable/);
  assert.match(loginPage, /const \{ loadUser, login \} = useAuth\(\)/);
  assert.match(loginPage, /await login\(form\)/);
  assert.doesNotMatch(loginPage, /AuthService\.login/);
  assert.match(lowLevelAuth, /this\.configured = isSupabaseConfigured;/);
  assert.match(storage, /this\.configured = isSupabaseConfigured;/);
});
