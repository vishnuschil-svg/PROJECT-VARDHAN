import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  ONBOARDING_STATUS,
  PASSWORD_RECOVERY_MESSAGE,
  normalizeE164,
  normalizeOtp,
  resolvePostAuthRoute,
  toCustomerAuthMessage,
  validateRegistration,
} from "../../services/auth/CustomerAuthContracts.js";

const root = new URL("../../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("valid registration trims identity fields and normalizes an Indian mobile", () => {
  const result = validateRegistration({ fullName: "  Vardhan Owner ", businessName: "  Vardhan Chits ", email: " Owner@Example.COM ", countryCode: "+91", mobile: "98765 43210", password: "Secure123", acceptedTerms: true });
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, { fullName: "Vardhan Owner", businessName: "Vardhan Chits", email: "owner@example.com", mobile: "+919876543210", password: "Secure123" });
});

test("invalid email, whitespace names, weak password and missing terms are rejected", () => {
  const result = validateRegistration({ fullName: " ", businessName: " ", email: "invalid", countryCode: "+91", mobile: "9876543210", password: "weak", acceptedTerms: false });
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.errors).sort(), ["acceptedTerms", "businessName", "email", "fullName", "password"]);
});

test("invalid mobile cannot be normalized", () => {
  assert.equal(normalizeE164("+91", "123"), "");
  assert.equal(validateRegistration({ fullName: "Owner", businessName: "Business", email: "a@b.com", mobile: "123", password: "Secure123", acceptedTerms: true }).errors.mobile, "Enter a valid mobile number with country code.");
});

test("duplicate registration errors guide recovery without raw backend details", () => {
  assert.match(toCustomerAuthMessage(new Error("User already registered")), /sign in, verify the pending account, or reset/i);
});

test("OTP contract accepts only six numeric digits and maps invalid or expired codes", () => {
  assert.equal(normalizeOtp("12a34 56"), "123456");
  assert.match(toCustomerAuthMessage(new Error("Token expired")), /expired/i);
  assert.match(toCustomerAuthMessage(new Error("invalid otp")), /6-digit/i);
});

test("registration uses real Supabase email signup verification and no phone OTP claim", async () => {
  const source = await read("src/services/auth/AccessProviderService.js");
  assert.match(source, /auth\.verifyOtp\([\s\S]*type: "signup"/);
  assert.match(source, /auth\.resend\(\{ type: "signup"/);
  assert.match(source, /phoneOtp: false/);
  assert.doesNotMatch(source, /signInWithOtp\(\{ phone/);
});

test("verification page has successful-resend countdown and double-submit guards", async () => {
  const source = await read("src/pages/auth/EmailVerification.jsx");
  assert.match(source, /await AccessProviderService\.resendEmailOtp\(email\);\s*setCountdown\(60\)/);
  assert.match(source, /if \(submitting\.current\) return/);
  assert.match(source, /onPaste=\{handlePaste\}/);
  assert.match(source, /Backspace/);
});

test("verified and incomplete users route to the correct destination", () => {
  assert.equal(resolvePostAuthRoute({ user: { id: "u1" }, profile: { onboarding_status: ONBOARDING_STATUS.COMPLETE }, company: { workspace_id: "w1" } }), "/dashboard");
  assert.equal(resolvePostAuthRoute({ user: { id: "u1" }, profile: { onboarding_status: ONBOARDING_STATUS.PROFILE_READY } }), "/onboarding");
  assert.equal(resolvePostAuthRoute({}), "/login");
});

test("onboarding resumes persisted profile state instead of restarting registration", async () => {
  const source = await read("src/pages/auth/Onboarding.jsx");
  assert.match(source, /getOnboardingState\(\)/);
  assert.match(source, /state\.profile\?\.business_name/);
  assert.doesNotMatch(source, /registerOrganizer/);
});

test("profile and workspace provisioning are idempotent and identity-derived", async () => {
  const sql = await read("supabase/migrations/011_customer_auth_onboarding.sql");
  assert.match(sql, /email_confirmed_at is null/);
  assert.match(sql, /v_tenant_id := 'customer-' \|\| replace\(v_user\.id::text/);
  assert.match(sql, /on conflict \(id\) do update/);
  assert.match(sql, /on conflict \(tenant_id, data_scope\) do update/);
  assert.match(sql, /where public\.workspaces\.created_by = auth\.uid\(\)/);
});

test("workspace provisioning creates one owner membership and one trial product", async () => {
  const sql = await read("supabase/migrations/011_customer_auth_onboarding.sql");
  assert.match(sql, /'owner', 'active'/);
  assert.match(sql, /on conflict \(workspace_id, user_id\) do update/);
  assert.match(sql, /'chit_management', 'Free Trial', 'Trial'/);
  assert.match(sql, /on conflict \(tenant_id, data_scope, product_id\) do update/);
});

test("forgot-password response remains privacy safe", async () => {
  assert.equal(PASSWORD_RECOVERY_MESSAGE, "If an account exists for this email, we’ve sent recovery instructions.");
  const source = await read("src/pages/auth/ForgotPassword.jsx");
  assert.match(source, /catch \{ \/\* Keep account existence and provider responses private\. \*\//);
  assert.match(source, /setMessage\(PASSWORD_RECOVERY_MESSAGE\)/);
});

test("reset-password blocks an invalid recovery session", async () => {
  const source = await read("src/pages/auth/ResetPassword.jsx");
  assert.match(source, /hasRecoverySession\(\)/);
  assert.match(source, /This recovery link is invalid or expired/);
  assert.match(source, /if \(submitting\.current \|\| !validSession\) return/);
});

test("tenant isolation and existing RLS authority remain enforced", async () => {
  const onboardingSql = await read("supabase/migrations/011_customer_auth_onboarding.sql");
  const rlsSql = await read("supabase/migrations/002_production_rls.sql");
  assert.match(onboardingSql, /security definer[\s\S]*set row_security = off/);
  assert.match(onboardingSql, /grant execute on function public\.provision_customer_workspace\(text, text\) to authenticated/);
  assert.match(rlsSql, /workspace_memberships is authoritative for tenant\/workspace access/);
  assert.match(rlsSql, /create policy workspaces_insert[\s\S]*public\.is_platform_owner\(\)/);
});
