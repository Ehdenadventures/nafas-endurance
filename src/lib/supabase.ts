import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Server-only Supabase client using the service role key. Returns null when not configured (demo mode). */
export function db(): SupabaseClient | null {
  // trim: values pasted into Vercel often carry a stray space or line break
  // Also accepts the URL with /rest/v1 on the end or without https://, as people often copy it that way.
  let url = process.env.SUPABASE_URL?.trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
  if (url && !/^https?:\/\//.test(url)) url = `https://${url}`;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().replace(/^["']|["']$/g, "");
  if (!url || !key) return null;
  client ??= createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export const MEDIA_BUCKET = "media";
