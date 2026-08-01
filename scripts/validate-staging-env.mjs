import { readFile } from "node:fs/promises";

const fileArgument = process.argv.find((argument) => argument.startsWith("--env-file="));
const environment = { ...process.env };
if (fileArgument) Object.assign(environment, parseEnvironmentFile(await readFile(fileArgument.slice(11), "utf8")));

const required = [
  "VITE_DEV_AUTH_BYPASS", "VITE_APP_MODE", "VITE_REPOSITORY_BACKEND", "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY", "VITE_PLATFORM_API_URL", "DATABASE_URL", "SUPABASE_JWT_SECRET",
  "SUPABASE_JWT_AUDIENCE", "VARDHAN_ENV", "CORS_ORIGINS", "RATE_LIMIT_BACKEND", "REDIS_URL",
  "DRAW_ENCRYPTION_KEY", "LICENSE_SIGNING_SECRET", "BACKUP_ENCRYPTION_KEY",
];
const missing = required.filter((name) => !String(environment[name] || "").trim());
const invalid = [];

expectEqual("VITE_DEV_AUTH_BYPASS", "false");
expectOneOf("VITE_APP_MODE", ["staging"]);
expectEqual("VITE_REPOSITORY_BACKEND", "supabase");
expectEqual("VARDHAN_ENV", "staging");
expectEqual("RATE_LIMIT_BACKEND", "redis");
expectUrl("VITE_SUPABASE_URL", ["https:"]);
expectUrl("DATABASE_URL", ["postgres:", "postgresql:"]);
expectUrl("REDIS_URL", ["rediss:"]);
if (environment.VITE_PLATFORM_API_URL && environment.VITE_PLATFORM_API_URL !== "/api") expectUrl("VITE_PLATFORM_API_URL", ["https:"]);
validateCors();
for (const name of ["SUPABASE_JWT_SECRET", "DRAW_ENCRYPTION_KEY", "LICENSE_SIGNING_SECRET", "BACKUP_ENCRYPTION_KEY"]) expectMinimumLength(name, 32);
expectCompleteGroup("WhatsApp", ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"]);
expectCompleteGroup("SMS", ["SMS_GATEWAY_URL", "SMS_GATEWAY_API_KEY", "SMS_SENDER_ID"]);
expectCompleteGroup("email", ["EMAIL_API_KEY", "EMAIL_FROM"]);
expectCompleteGroup("Razorpay", ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"]);

const forbiddenFrontendNames = Object.keys(environment).filter((name) => /^VITE_.*(SECRET|TOKEN|PASSWORD|SERVICE_ROLE|PRIVATE_KEY)$/i.test(name) && environment[name]);
for (const name of forbiddenFrontendNames) invalid.push(`${name} must not be exposed through a VITE_ variable`);

const failures = [...missing.map((name) => `${name} is missing`), ...invalid];
console.log(JSON.stringify({ ok: failures.length === 0, environment: "staging", requiredVariables: required.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;

function parseEnvironmentFile(source) {
  const values = {};
  for (const originalLine of source.split(/\r?\n/)) {
    const line = originalLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const name = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[name] = value;
  }
  return values;
}

function expectEqual(name, expected) {
  if (environment[name] && environment[name] !== expected) invalid.push(`${name} must be ${expected} for staging`);
}
function expectOneOf(name, options) {
  if (environment[name] && !options.includes(environment[name])) invalid.push(`${name} must be one of: ${options.join(", ")}`);
}
function expectUrl(name, protocols) {
  if (!environment[name]) return;
  try {
    const parsed = new URL(environment[name]);
    if (!protocols.includes(parsed.protocol)) invalid.push(`${name} must use ${protocols.join(" or ")}`);
  } catch { invalid.push(`${name} must be a valid URL`); }
}
function expectMinimumLength(name, length) {
  if (environment[name] && environment[name].length < length) invalid.push(`${name} must contain at least ${length} characters`);
}
function expectCompleteGroup(label, names) {
  const configured = names.filter((name) => String(environment[name] || "").trim());
  if (configured.length && configured.length !== names.length) invalid.push(`${label} staging configuration is incomplete; configure all of: ${names.join(", ")}`);
}
function validateCors() {
  if (!environment.CORS_ORIGINS) return;
  const origins = environment.CORS_ORIGINS.split(",").map((item) => item.trim()).filter(Boolean);
  if (!origins.length || origins.includes("*")) invalid.push("CORS_ORIGINS must contain explicit staging origins and must not use *");
  for (const origin of origins) {
    try { if (new URL(origin).protocol !== "https:") invalid.push("Every CORS_ORIGINS entry must use https"); }
    catch { invalid.push("Every CORS_ORIGINS entry must be a valid origin URL"); }
  }
}
