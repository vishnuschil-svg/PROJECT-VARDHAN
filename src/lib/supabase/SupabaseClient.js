import { createClient } from "@supabase/supabase-js";

const environment = import.meta.env || {};
const supabaseUrl = environment.VITE_SUPABASE_URL;
const supabaseAnonKey = environment.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

export function getSupabaseClient() {
  return supabaseClient;
}
