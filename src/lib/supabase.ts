import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Server-only Supabase client using the service role key. Returns null when not configured (demo mode). */
export function db(): SupabaseClient | null {
  // Values pasted into Vercel often carry spaces, line breaks, quotes, /rest/v1 or a missing https://.
  const clean = (v?: string) => v?.replace(/\s+/g, "").replace(/^["']|["']$/g, "");
  let url = clean(process.env.SUPABASE_URL)?.replace(/^https?:\/\/(?=eyJ|sb_)/, "");
  let key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const looksLikeKey = (v?: string) => !!v && /^(eyJ|sb_)/.test(v);
  // If the two values were pasted into each other's boxes, swap them back.
  if (looksLikeKey(url) && key && !looksLikeKey(key)) [url, key] = [key, url];
  url = url?.replace(/\/+$/, "").replace(/\/rest\/v1$/, "").toLowerCase();
  if (url && !/^https?:\/\//.test(url)) url = `https://${url}`;
  if (url && !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) && !process.env.SUPABASE_ALLOW_CUSTOM_URL) {
    throw new Error(`SUPABASE_URL looks wrong. It should be like https://abcdefgh.supabase.co (it starts with "${url.slice(0, 14)}...").`);
  }
  if (key && !looksLikeKey(key)) {
    throw new Error(`SUPABASE_SERVICE_ROLE_KEY looks wrong. It should start with eyJ or sb_secret_ (it starts with "${key.slice(0, 6)}...").`);
  }
  if (!url || !key) return null;
  client ??= createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export const MEDIA_BUCKET = "media";
