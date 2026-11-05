import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Server-only Supabase client using the service role key. Returns null when not configured (demo mode). */
export function db(): SupabaseClient | null {
  // trim: values pasted into Vercel often carry a stray space or line break
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  client ??= createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export const MEDIA_BUCKET = "media";
