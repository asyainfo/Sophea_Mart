/// <reference types="vite/client" />
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = (import.meta as any).env
  .VITE_SUPABASE_ANON_KEY as string;

// 1. Fail fast with a clear message if environment variables are missing
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "⚠️ Missing Supabase environment variables! Check your .env file and Vercel Environment Variables.",
  );
}

// 2. Configure client for better auth stability and performance
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Keeps users logged in when they refresh
    autoRefreshToken: true, // Automatically refreshes expired login tokens
    detectSessionInUrl: true, // Needed for OAuth / password reset links
  },
});
