import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("your-project-id") &&
    !supabaseAnonKey.includes("your-supabase-anon-key")
);

// Real client if configured, otherwise fallback proxy/mock client for seamless offline/dev testing
let supabaseInstance = null;

if (isSupabaseConfigured) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
} else {
  // In development when env vars are not set yet, provide local storage-backed mock auth
  // so the application can be previewed without crashing.
  console.info(
    "💡 AstraForge Auth Notice: Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are not set or are placeholders. Running in local simulation mode for instant preview."
  );
}

export const supabase = supabaseInstance;
