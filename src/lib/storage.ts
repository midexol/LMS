import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "course-uploads";

let adminClient: SupabaseClient | null = null;

/**
 * Server-only Supabase client using the service role key. Never import this from client components:
 * the service role key bypasses all storage policies.
 */
export function getStorageAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase Storage is not configured: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }
  adminClient ??= createClient(url, serviceKey, { auth: { persistSession: false } });
  return adminClient;
}
