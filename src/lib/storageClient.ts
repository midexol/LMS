import { createClient, SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/**
 * Browser Supabase client using the public anon key. It can only upload through
 * one-time signed URLs issued by /api/tutor/upload.
 */
export function getBrowserStorage(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("File uploads are not configured.");
  }
  browserClient ??= createClient(url, anonKey, { auth: { persistSession: false } });
  return browserClient;
}
