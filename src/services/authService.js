import { AuthService } from "./auth/AuthService";

export async function registerCustomer() {
  throw new Error("Customer registration will be enabled when Supabase Auth is connected.");
}

export async function loginUser(email, password) {
  return AuthService.login({ email, password });
}

export async function logoutUser() {
  return AuthService.logout();
}

export async function sendPasswordReset() {
  throw new Error("Password reset will be enabled when Supabase Auth is connected.");
}

export async function updatePassword() {
  throw new Error("Password update will be enabled when Supabase Auth is connected.");
}
