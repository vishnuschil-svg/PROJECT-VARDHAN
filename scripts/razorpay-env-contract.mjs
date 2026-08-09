export const RAZORPAY_SERVER_VARIABLES = Object.freeze([
  "RAZORPAY_MODE",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "CRON_SECRET",
]);

export function validateRazorpayEnvironment(environment = {}, { requireValues = false, production = false } = {}) {
  const failures = [];
  const value = (name) => String(environment[name] || "").trim();

  if (requireValues) {
    for (const name of RAZORPAY_SERVER_VARIABLES) if (!value(name)) failures.push(`${name} is missing`);
  }

  const mode = value("RAZORPAY_MODE").toLowerCase();
  if (mode && !["test", "live"].includes(mode)) failures.push("RAZORPAY_MODE must be test or live");
  if (production && mode !== "live") failures.push("RAZORPAY_MODE must be live in production");

  const keyId = value("RAZORPAY_KEY_ID");
  if (keyId && mode === "test" && !keyId.startsWith("rzp_test_")) failures.push("RAZORPAY_KEY_ID must start with rzp_test_ in test mode");
  if (keyId && mode === "live" && !keyId.startsWith("rzp_live_")) failures.push("RAZORPAY_KEY_ID must start with rzp_live_ in live mode");

  for (const name of Object.keys(environment)) {
    if (/^VITE_.*(RAZORPAY.*SECRET|WEBHOOK.*SECRET|KEY_SECRET)/i.test(name) && value(name)) {
      failures.push(`${name} must not expose a Razorpay secret to the frontend`);
    }
  }

  return { ok: failures.length === 0, failures };
}
