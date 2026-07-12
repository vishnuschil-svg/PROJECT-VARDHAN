import { isSupabaseConfigured, supabaseClient } from "../../lib/supabase/SupabaseClient.js";

export const ACCESS_CAPABILITIES = Object.freeze({
  password: true,
  otp: isSupabaseConfigured,
  passkey: typeof window !== "undefined" && Boolean(window.PublicKeyCredential),
  provider: isSupabaseConfigured ? "supabase" : "demo",
});

export const AccessProviderService = {
  getCapabilities() {
    return ACCESS_CAPABILITIES;
  },

  async requestOtp({ phone }) {
    assertProvider("Mobile OTP");
    const normalizedPhone = String(phone || "").replace(/\s+/g, "");
    if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
      throw new Error("Enter the mobile number with country code, for example +91 98765 43210.");
    }
    const { error } = await supabaseClient.auth.signInWithOtp({ phone: normalizedPhone });
    if (error) throw new Error(toSafeAccessMessage(error, "OTP could not be sent."));
    return { phone: normalizedPhone, delivery: "sms" };
  },

  async verifyOtp({ phone, token }) {
    assertProvider("Mobile OTP");
    const { data, error } = await supabaseClient.auth.verifyOtp({
      phone: String(phone || "").replace(/\s+/g, ""),
      token: String(token || "").trim(),
      type: "sms",
    });
    if (error) throw new Error(toSafeAccessMessage(error, "OTP verification failed."));
    return data;
  },

  async registerOrganizer({ mobile, fullName, businessName, email, password }) {
    assertProvider("Organizer registration");
    if (!email) {
      throw new Error("Email is currently required by the configured authentication provider.");
    }
    const { data, error } = await supabaseClient.auth.signUp({
      email: String(email).trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: String(fullName || "").trim(),
          business_name: String(businessName || "").trim(),
          mobile: String(mobile || "").trim(),
          requested_role: "BUSINESS_OWNER",
        },
      },
    });
    if (error) throw new Error(toSafeAccessMessage(error, "Registration could not be completed."));
    return data;
  },

  async sendPasswordReset(email) {
    assertProvider("Password recovery");
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabaseClient.auth.resetPasswordForEmail(
      String(email || "").trim().toLowerCase(),
      { redirectTo }
    );
    if (error) throw new Error(toSafeAccessMessage(error, "Reset instructions could not be sent."));
  },

  async updatePassword(password) {
    assertProvider("Password update");
    const { error } = await supabaseClient.auth.updateUser({ password });
    if (error) throw new Error(toSafeAccessMessage(error, "Password could not be updated."));
  },
};

function assertProvider(feature) {
  if (!isSupabaseConfigured || !supabaseClient) {
    throw new Error(`${feature} is ready but not enabled. Connect the approved authentication provider to use it.`);
  }
}

function toSafeAccessMessage(error, fallback) {
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("rate") || message.includes("too many")) return "Too many attempts were made. Wait a moment and try again.";
  if (message.includes("invalid") || message.includes("expired")) return "The access details are invalid or expired. Check them and try again.";
  return fallback;
}
