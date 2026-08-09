import { isSupabaseConfigured, supabaseClient } from "../../lib/supabase/SupabaseClient.js";
import {
  ONBOARDING_STATUS,
  normalizeEmail,
  normalizeOtp,
  toCustomerAuthMessage,
  validateRegistration,
} from "./CustomerAuthContracts.js";

export const ACCESS_CAPABILITIES = Object.freeze({
  password: true,
  emailOtp: isSupabaseConfigured,
  phoneOtp: false,
  otp: false,
  passkey: typeof window !== "undefined" && Boolean(window.PublicKeyCredential),
  provider: isSupabaseConfigured ? "supabase" : "demo",
});

export const AccessProviderService = {
  getCapabilities() {
    return ACCESS_CAPABILITIES;
  },

  async requestOtp() {
    throw new Error("Mobile OTP is not enabled in this environment. No message was sent.");
  },

  async verifyOtp() {
    throw new Error("Mobile OTP is not enabled in this environment.");
  },

  async registerOrganizer(input) {
    assertProvider("Organizer registration");
    const validation = validateRegistration(input);
    if (!validation.ok) {
      const error = new Error(Object.values(validation.errors)[0]);
      error.validation = validation.errors;
      throw error;
    }
    const { email, password, fullName, businessName, mobile } = validation.value;
    const referralCode = String(input.referralCode || "").trim().toUpperCase();
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
        data: {
          full_name: fullName,
          business_name: businessName,
          mobile,
          onboarding_status: "verification_pending",
          requested_product: "chit_management",
          ...(referralCode ? { referral_code: referralCode } : {}),
        },
      },
    });
    if (error) throw new Error(toCustomerAuthMessage(error, "Registration could not be completed."));
    if (Array.isArray(data.user?.identities) && data.user.identities.length === 0) {
      return { status: "duplicate", email, requiresVerification: false };
    }
    if (data.session) {
      await this.ensureVerifiedProfile();
      return { ...data, email, status: "verified", requiresVerification: false };
    }
    return { ...data, email, status: "verification_pending", requiresVerification: true };
  },

  async verifyEmailOtp({ email, token }) {
    assertProvider("Email verification");
    const normalizedToken = normalizeOtp(token);
    if (normalizedToken.length !== 6) throw new Error("Enter the 6-digit verification code.");
    const { data, error } = await supabaseClient.auth.verifyOtp({
      email: normalizeEmail(email),
      token: normalizedToken,
      type: "signup",
    });
    if (error) throw new Error(toCustomerAuthMessage(error, "The verification code could not be confirmed."));
    await this.ensureVerifiedProfile();
    const { error: codeError } = await supabaseClient.rpc("ensure_customer_referral_code");
    if (codeError) throw new Error(toCustomerAuthMessage(codeError, "Your referral profile could not be prepared."));
    const { error: attributionError } = await supabaseClient.rpc("capture_referral_attribution");
    if (attributionError) throw new Error(toCustomerAuthMessage(attributionError, "Referral attribution could not be recorded."));
    return data;
  },

  async resendEmailOtp(email) {
    assertProvider("Email verification");
    const { error } = await supabaseClient.auth.resend({ type: "signup", email: normalizeEmail(email) });
    if (error) throw new Error(toCustomerAuthMessage(error, "A new verification code could not be sent."));
    return { success: true };
  },

  async ensureVerifiedProfile() {
    assertProvider("Profile setup");
    const { data, error } = await supabaseClient.rpc("upsert_verified_customer_profile");
    if (error) throw new Error(toCustomerAuthMessage(error, "Your verified profile could not be prepared. Try again."));
    return data;
  },

  async getOnboardingState() {
    assertProvider("Onboarding");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData.user) return { authenticated: false, status: ONBOARDING_STATUS.PROFILE_PENDING };
    const { data: profile, error } = await supabaseClient
      .from("user_profiles")
      .select("id,full_name,email,mobile,business_name,onboarding_status,workspace_id")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (error) throw new Error("Your onboarding progress could not be loaded. Try again.");
    return {
      authenticated: true,
      verified: Boolean(userData.user.email_confirmed_at),
      status: profile?.onboarding_status || ONBOARDING_STATUS.PROFILE_PENDING,
      profile,
      metadata: userData.user.user_metadata || {},
    };
  },

  async provisionWorkspace({ businessName, businessType = "chit_management", declarationAccepted = false, declarationVersion = "" }) {
    assertProvider("Workspace setup");
    const normalizedName = String(businessName || "").trim();
    if (!normalizedName) throw new Error("Enter your business name.");
    if (declarationAccepted !== true) throw new Error("Accept the organizer responsibility declaration to continue.");
    const { error: declarationError } = await supabaseClient.auth.updateUser({
      data: {
        group_manager_declaration_accepted: true,
        group_manager_declaration_version: String(declarationVersion || ""),
        group_manager_declaration_accepted_at: new Date().toISOString(),
      },
    });
    if (declarationError) throw new Error(toCustomerAuthMessage(declarationError, "Your responsibility declaration could not be recorded. Try again."));
    const { data, error } = await supabaseClient.rpc("provision_customer_workspace", {
      p_business_name: normalizedName,
      p_business_type: businessType,
    });
    if (error) throw new Error(toCustomerAuthMessage(error, "Your workspace could not be created. Your profile is safe; try again."));
    return Array.isArray(data) ? data[0] : data;
  },

  async sendPasswordReset(email) {
    assertProvider("Password recovery");
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabaseClient.auth.resetPasswordForEmail(normalizeEmail(email), { redirectTo });
    if (error) throw new Error(toCustomerAuthMessage(error, "Recovery instructions could not be sent."));
  },

  async hasRecoverySession() {
    assertProvider("Password recovery");
    const location = typeof window === "undefined" ? "" : `${window.location.search}${window.location.hash}`;
    const fromRecoveryLink = /(?:type=|type%3D)recovery/i.test(location);
    const { data, error } = await supabaseClient.auth.getSession();
    return !error && Boolean(data.session) && fromRecoveryLink;
  },

  async updatePassword(password) {
    assertProvider("Password update");
    const { error } = await supabaseClient.auth.updateUser({ password });
    if (error) throw new Error(toCustomerAuthMessage(error, "Password could not be updated."));
  },
};

function assertProvider(feature) {
  if (!isSupabaseConfigured || !supabaseClient) {
    throw new Error(`${feature} is ready but not enabled. Connect the approved authentication provider to use it.`);
  }
}
