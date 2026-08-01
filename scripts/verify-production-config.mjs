import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const [vercel, envExample, migration, workflow, backend] = await Promise.all([
  read("vercel.json"), read(".env.example"), read("supabase/migrations/005_enterprise_production_infrastructure.sql"),
  read(".github/workflows/production-ci.yml"), read("backend/main.py"),
]);
const failures = [];
for (const header of ["Content-Security-Policy", "Strict-Transport-Security", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "X-Frame-Options"]) requireMatch(vercel, header, `missing ${header}`);
for (const variable of ["DATABASE_URL", "SUPABASE_JWT_SECRET", "REDIS_URL", "WHATSAPP_ACCESS_TOKEN", "SMS_GATEWAY_API_KEY", "EMAIL_API_KEY", "RAZORPAY_KEY_SECRET", "LICENSE_SIGNING_SECRET", "BACKUP_ENCRYPTION_KEY", "MONITORING_ALERT_WEBHOOK"]) requireMatch(envExample, new RegExp(`^${variable}=`, "m"), `missing environment contract ${variable}`);
for (const table of ["notification_deliveries", "billing_subscriptions", "license_activations", "gst_invoices", "tenant_backups", "restore_audit_logs", "production_events"]) {
  requireMatch(migration, `public.${table}`, `missing production table ${table}`);
  requireMatch(migration, new RegExp(`alter table public\\.%I enable row level security|alter table public\\.${table} enable row level security`), `RLS enablement missing for ${table}`);
}
requireMatch(migration, "force row level security", "forced RLS is missing");
requireMatch(workflow, "npm test", "CI test gate is missing");
requireMatch(workflow, "npm run build", "CI build gate is missing");
requireMatch(backend, "public.workspace_memberships", "backend is not using canonical membership authorization");
if (/VITE_[A-Z0-9_]*(SECRET|TOKEN|API_KEY)=\S+/m.test(envExample)) failures.push("frontend-prefixed secret value detected");
console.log(JSON.stringify({ ok: failures.length === 0, checks: 27, failures }, null, 2));
if (failures.length) process.exitCode = 1;

async function read(path) { return readFile(new URL(path, root), "utf8"); }
function requireMatch(value, pattern, message) {
  const matched = pattern instanceof RegExp ? pattern.test(value) : value.includes(pattern);
  if (!matched) failures.push(message);
}
