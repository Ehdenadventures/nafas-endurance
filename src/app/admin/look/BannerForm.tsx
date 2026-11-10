"use client";
/* eslint-disable @next/next/no-img-element */
import { useState, useTransition } from "react";
import type { BannerSettings } from "@/lib/types";
import { createUploadUrl, saveBannerAction } from "../actions";

export default function BannerForm({ initial, uploads }: { initial: BannerSettings; uploads: boolean }) {
  const [b, setB] = useState(initial);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) return setError("Please use a picture under 15 MB.");
    setError(""); setMsg("Uploading...");
    const res = await createUploadUrl(file.name, "banner");
    if ("error" in res) { setMsg(""); return setError(res.error); }
    const body = new FormData();
    body.append("cacheControl", "31536000");
    body.append("", file);
    const put = await fetch(res.uploadUrl, { method: "PUT", body, headers: { "x-upsert": "false" } });
    if (!put.ok) { setMsg(""); return setError(`Upload failed (${put.status}).`); }
    setB((x) => ({ ...x, image: res.publicUrl }));
    setMsg("Uploaded. Press Save to show it on the shop.");
  }

  function save() {
    setError(""); setMsg("");
    start(async () => {
      const r = await saveBannerAction(b);
      if (r.error) setError(r.error);
      else setMsg("Saved. The home page shows it now.");
    });
  }

  return (
    <div className="space-y-5 rounded-2xl border border-line bg-surface p-5">
      {/* Preview: same navy box and text colours as the real banner. */}
      <div className="relative overflow-hidden rounded-2xl bg-[#082161] text-white" aria-label="Preview">
        {b.image && <img src={b.image} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: b.opacity / 100 }} />}
        <div className="relative px-6 py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#ffc62e]">Ultimate Italia</p>
          <p className="mt-2 text-3xl font-extrabold">Product name</p>
          <p className="mt-2 text-xl font-bold text-[#ffc62e]">$2.50</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {uploads ? (
          <label className="btn cursor-pointer">
            {b.image ? "Change picture" : "Upload picture"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          </label>
        ) : (
          <input className="input flex-1" placeholder="Paste a picture link" value={b.image} onChange={(e) => setB({ ...b, image: e.target.value })} />
        )}
        {b.image && <button type="button" className="text-sm text-bad" onClick={() => setB({ ...b, image: "" })}>Remove picture</button>}
      </div>

      <div className="field">
        <label htmlFor="opacity">How strong the picture shows: <b>{b.opacity}%</b></label>
        <input id="opacity" type="range" min={0} max={100} step={5} value={b.opacity}
          onChange={(e) => setB({ ...b, opacity: Number(e.target.value) })} className="w-full accent-[var(--accent)]" />
        <span className="text-xs text-ink-3">Lower = more see-through (softer), higher = stronger picture. Around 25–40% keeps the text easy to read.</span>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={b.all} onChange={(e) => setB({ ...b, all: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />
        Also show it behind the first slide (the one with the logo and welcome text)
      </label>

      {error && <p role="alert" className="rounded-xl bg-bad/10 px-4 py-3 text-sm text-bad">{error}</p>}
      {msg && <p className="text-sm text-ink-2" aria-live="polite">{msg}</p>}
      <button type="button" className="btn btn-primary" onClick={save} disabled={pending}>{pending ? "Saving..." : "Save"}</button>
    </div>
  );
}
