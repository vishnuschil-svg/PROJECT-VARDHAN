import { supabase } from "../lib/supabase";

export async function registerCustomer(form) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: form.email,
    password: form.password,
  });

  if (authError) throw authError;

  const userId = authData.user?.id;
  if (!userId) throw new Error("User creation failed");

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert({
      business_name: form.businessName,
      owner_name: form.ownerName,
      mobile: form.mobile,
      email: form.email,
      status: "pending",
      license_type: "trial",
    })
    .select()
    .single();

  if (customerError) throw customerError;

  const { error: profileError } = await supabase.from("user_profiles").insert({
    id: userId,
    customer_id: customer.id,
    full_name: form.ownerName,
    mobile: form.mobile,
    role: "customer_admin",
    status: "pending",
  });

  if (profileError) throw profileError;

  return authData;
}

export async function loginUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  if (profileError) throw profileError;

  if (profile.status !== "approved") {
    await supabase.auth.signOut();
    throw new Error("Your account is pending admin approval.");
  }

  return data;
}

export async function logoutUser() {
  return await supabase.auth.signOut();
}
