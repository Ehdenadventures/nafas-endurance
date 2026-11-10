"use client";
/* eslint-disable @next/next/no-img-element */
import { useState, useTransition } from "react";
import type { BannerSettings, SlideBackground } from "@/lib/types";
import { Backdrop, slideBackground } from "@/components/HeroSlider";
import { createUploadUrl, saveBannerAction } from "../actions";

type Slide = { key: string; label: string; photo?: string };
const EMPTY: SlideBackground = { image: "", opacity: 35, x: 50, y: 50 };

async function uploadFile(file: File): Promise<string> {
  if (file.size > 15 * 1024 * 1024) throw new Error("Please use a picture under 15 MB.");
  const res = await createUploadUrl(file.name, "banner");
  if ("error" in res) throw new Error(res.error);
  const body = new FormData();
  body.append("cacheControl", "31536000");
  body.append("", file);
  const put = await fetch(res.uploadUrl, { method: "PUT", body, headers: { "x-upsert": "false" } });
  if (!put.ok) throw new Error(`Upload failed (${put.status}).`);
  return res.publicUrl;
}

/** Picture, strength and position controls for one background, with a preview in the banner's colours. */
function BackgroundEditor({ title, value, onChange, preview, photo, uploads, note }: {
  title: string; value: SlideBackground; onChange: (v: SlideBackground) => void; preview?: SlideBackground; photo?: string; uploads: boolean; note?: React.ReactNode;
}) {
  const [busy, setBusy] = useState("");
  const set = (patch: Partial<SlideBackground>) => onChange({ ...value, ...patch });
  const slider = (label: string, key: "opacity" | "x" | "y", hint: [string, string]) => (
    <div className="field">
      <label>{label}: <b>{value[key]}%</b></label>
      <input type="range" min={0} max={100} step={5} value={value[key]} disabled={!value.image} aria-label={`${label} for ${title}`}
        onChange={(e) => set({ [key]: Number(e.target.value) })} className="w-full accent-[var(--accent)] disabled:opacity-40" />
      <span className="flex justify-between text-xs text-ink-3"><span>{hint[0]}</span><span>{hint[1]}</span></span>
    </div>
  );
  return (
    <section className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-semibold">{title}</h2>
      <div className="relative overflow-hidden rounded-xl bg-[#082161] text-white">
        <Backdrop bg={preview} />
        <div className="relative grid min-h-36 grid-cols-2 items-center gap-3 px-5 py-6">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-[#ffc62e]">Preview</p>
            <p className="mt-1 text-xl font-extrabold leading-tight">{title}</p>
          </div>
          {photo && <img src={photo} alt="" className="ml-auto max-h-28 rounded-lg object-contain" />}
        </div>
      </div>
      {note}
      <div className="flex flex-wrap items-center gap-3">
        {uploads ? (
          <label className="btn cursor-pointer py-1.5 text-sm">
            {value.image ? "Change picture" : "Upload picture"}
            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setBusy("Uploading...");
              try { set({ image: await uploadFile(f) }); setBusy(""); } catch (err) { setBusy((err as Error).message); }
            }} />
          </label>
        ) : (
          <input className="input flex-1" placeholder="Paste a picture link" aria-label={`Picture link for ${title}`} value={value.image} onChange={(e) => set({ image: e.target.value })} />
        )}
        {value.image && <button type="button" className="text-sm text-bad" onClick={() => set({ image: "" })}>Remove picture</button>}
        {busy && <span className="text-xs text-ink-3" aria-live="polite">{busy}</span>}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {slider("Strength", "opacity", ["see-through", "strong"])}
        {slider("Left – right", "x", ["left side", "right side"])}
        {slider("Top – bottom", "y", ["top", "bottom"])}
      </div>
    </section>
  );
}

export default function BannerForm({ initial, slides, uploads }: { initial: BannerSettings; slides: Slide[]; uploads: boolean }) {
  const [b, setB] = useState(initial);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const { all, slides: own, ...base } = b;

  function save() {
    setError(""); setMsg("");
    start(async () => {
      const r = await saveBannerAction(b);
      if (r.error) setError(r.error);
      else setMsg("Saved. The home page shows it now.");
    });
  }

  return (
    <div className="space-y-4">
      <BackgroundEditor title="Default picture (all product slides)" value={base} uploads={uploads}
        preview={base.image ? base : undefined} onChange={(v) => setB({ ...b, ...v })}
        note={
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={all} onChange={(e) => setB({ ...b, all: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />
            Also use it behind the first slide
          </label>
        } />

      <h2 className="pt-2 text-lg font-bold">Each slide</h2>
      <p className="text-sm text-ink-2">Upload a picture for a slide to replace the default on that slide only. Remove it to go back to the default.</p>
      {slides.map((s) => (
        <BackgroundEditor key={s.key} title={s.label} photo={s.photo} uploads={uploads}
          value={own[s.key] ?? { ...EMPTY, opacity: base.opacity }}
          preview={slideBackground(b, s.key)}
          onChange={(v) => {
            const next = { ...own };
            if (v.image) next[s.key] = v; else delete next[s.key];
            setB({ ...b, slides: next });
          }} />
      ))}
      {slides.length === 1 && <p className="text-sm text-ink-3">Products appear here once they have a photo (the banner shows the first 6).</p>}

      <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <button type="button" className="btn btn-primary" onClick={save} disabled={pending}>{pending ? "Saving..." : "Save banner"}</button>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
        {msg && <p className="text-sm text-ink-2" aria-live="polite">{msg}</p>}
      </div>
    </div>
  );
}
