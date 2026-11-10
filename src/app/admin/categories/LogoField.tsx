"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { createUploadUrl } from "../actions";

/** Brand logo: upload a picture (or paste a link). Sent with the category form as "logo". */
export default function LogoField({ initial, uploads }: { initial?: string | null; uploads: boolean }) {
  const [url, setUrl] = useState(initial ?? "");
  const [msg, setMsg] = useState("");

  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setMsg("Please use a picture under 5 MB.");
    setMsg("Uploading...");
    const res = await createUploadUrl(file.name, "brands");
    if ("error" in res) return setMsg(res.error);
    const body = new FormData();
    body.append("cacheControl", "31536000");
    body.append("", file);
    const put = await fetch(res.uploadUrl, { method: "PUT", body, headers: { "x-upsert": "false" } });
    if (!put.ok) return setMsg(`Upload failed (${put.status}).`);
    setUrl(res.publicUrl);
    setMsg("Uploaded. Press Save to keep it.");
  }

  return (
    <div className="flex flex-wrap items-center gap-3 sm:col-span-full">
      <input type="hidden" name="logo" value={url} />
      <span className="text-sm font-semibold text-ink-2">Brand logo</span>
      <span className="flex h-12 w-28 items-center justify-center rounded-lg border border-dashed border-line bg-bg">
        {url ? <img src={url} alt="Brand logo" className="max-h-10 max-w-24 object-contain" /> : <span className="text-xs text-ink-3">No logo</span>}
      </span>
      {uploads ? (
        <label className="btn cursor-pointer py-1.5 text-sm">
          {url ? "Change logo" : "Upload logo"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
        </label>
      ) : (
        <input className="input max-w-xs py-1.5 text-sm" placeholder="Paste a logo image link" value={url} onChange={(e) => setUrl(e.target.value)} />
      )}
      {url && <button type="button" className="text-sm text-bad" onClick={() => { setUrl(""); setMsg("Removed. Press Save to keep it."); }}>Remove</button>}
      {msg && <span className="text-xs text-ink-3" aria-live="polite">{msg}</span>}
      <span className="text-xs text-ink-3">A PNG with a transparent background looks best in the moving strip.</span>
    </div>
  );
}
