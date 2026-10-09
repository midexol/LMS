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

export const STORAGE_REF_PREFIX = "storage:";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 2; // 2 hours

/**
 * Lesson media is stored as a private reference (`storage:<object path>`), never a public URL.
 * Call this on the server, only for users allowed to see the content, to get a short-lived link.
 * Plain URLs (for example YouTube embeds) pass through unchanged.
 */
export async function resolveStorageUrl(value: string | null | undefined): Promise<string> {
  if (!value) return "";
  if (!value.startsWith(STORAGE_REF_PREFIX)) return value;

  const objectPath = value.slice(STORAGE_REF_PREFIX.length);
  const { data, error } = await getStorageAdmin()
    .storage.from(STORAGE_BUCKET)
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.error("[STORAGE] Failed to sign URL for", objectPath, error);
    return "";
  }
  return data.signedUrl;
}
