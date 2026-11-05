import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "Setup check", robots: { index: false } };

/** Shows whether the Supabase settings work, without revealing the secret key. */
export default async function Status() {
  const rawUrl = process.env.SUPABASE_URL ?? "";
  const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const keyKind = /^\s*eyJ/.test(rawKey) ? "legacy service_role key (eyJ...)" : /^\s*sb_secret_/.test(rawKey) ? "new secret key (sb_secret_...)" : /^\s*sb_publishable_/.test(rawKey) ? "PUBLISHABLE key: wrong one, use the secret or service_role key" : rawKey ? `unknown, starts with "${rawKey.trim().slice(0, 4)}"` : "missing";
  let result = "";
  try {
    const s = db();
    if (!s) result = "Not configured: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is empty.";
    else {
      const { count, error } = await s.from("products").select("*", { count: "exact", head: true });
      result = error ? `Supabase answered with an error: ${error.message}` : `OK: connected, ${count} products in the database.`;
    }
  } catch (e) {
    const err = e as Error & { cause?: { code?: string; message?: string } };
    result = `Could not connect: ${err.message}${err.cause ? ` (${err.cause.code ?? ""} ${err.cause.message ?? ""})` : ""}`;
  }
  const host = rawUrl.trim().replace(/^https?:\/\//, "").split("/")[0];
  return (
    <main className="mx-auto max-w-xl p-6 font-mono text-sm">
      <h1 className="mb-4 text-xl font-bold">Setup check</h1>
      <p>SUPABASE_URL host: <b>{host || "missing"}</b> ({rawUrl.trim().length} characters)</p>
      <p>SUPABASE_SERVICE_ROLE_KEY: <b>{keyKind}</b> ({rawKey.trim().length} characters)</p>
      <p className="mt-4">Result: <b>{result}</b></p>
    </main>
  );
}
