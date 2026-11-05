/* eslint-disable @next/next/no-img-element */
"use client";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { Post } from "@/lib/types";
import { createUploadUrl, deletePostAction, savePostAction } from "../../actions";

type P = { id: string; name: string; image?: string; active: boolean };

export default function PostForm({ post, products, uploads }: { post: Post | null; products: P[]; uploads: boolean }) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [caption, setCaption] = useState(post?.caption ?? "");
  const [image, setImage] = useState(post?.image ?? "");
  const [url, setUrl] = useState("");
  const [picked, setPicked] = useState<string[]>(post?.product_ids ?? []);
  const [active, setActive] = useState(post?.active ?? true);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [pending, start] = useTransition();

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const matches = products.filter((p) => !picked.includes(p.id) && p.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 40);

  async function upload(file: File | undefined) {
    if (!file) return;
    setError("");
    setBusy("Uploading picture...");
    const res = await createUploadUrl(file.name, "posts");
    if ("error" in res) { setError(res.error); setBusy(""); return; }
    const body = new FormData();
    body.append("cacheControl", "31536000");
    body.append("", file);
    const put = await fetch(res.uploadUrl, { method: "PUT", body, headers: { "x-upsert": "false" } });
    if (!put.ok) setError(`Upload failed (${put.status}).`);
    else setImage(res.publicUrl);
    setBusy("");
  }

  const move = (i: number, d: number) =>
    setPicked((c) => {
      const j = i + d;
      if (j < 0 || j >= c.length) return c;
      const n = [...c];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      const res = await savePostAction({ id: post?.id, title, caption, image, product_ids: picked, active });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{post ? `Edit post ${post.number}` : "New Instagram post"}</h1>
        <Link href="/admin/posts" className="text-sm text-ink-2 hover:text-ink">← All posts</Link>
      </div>

      <fieldset className="rounded-2xl border border-line bg-surface p-4">
        <legend className="px-1 text-sm font-semibold text-ink-2">1. Picture</legend>
        <p className="mb-3 text-xs text-ink-3">Use the same picture you post on Instagram (for a carousel, the first slide).</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="aspect-square w-full max-w-[220px] overflow-hidden rounded-xl border border-line bg-surface-2">
            {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <div className="layers h-full w-full" />}
          </div>
          <div className="flex flex-1 flex-col gap-2">
            {uploads && (
              <label className="btn cursor-pointer">
                {image ? "Change picture" : "Upload picture"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
              </label>
            )}
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="...or paste an image URL" value={url} onChange={(e) => setUrl(e.target.value)} />
              <button type="button" className="btn" onClick={() => { if (/^https?:\/\//.test(url)) { setImage(url); setUrl(""); setError(""); } }}>Use</button>
            </div>
            {busy && <p className="text-sm text-ink-2">{busy}</p>}
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-line bg-surface p-4">
        <legend className="px-1 text-sm font-semibold text-ink-2">2. Products in this post</legend>
        {picked.length > 0 && (
          <ol className="mb-3 space-y-2">
            {picked.map((id, i) => {
              const p = byId.get(id);
              return (
                <li key={id} className="flex items-center gap-3 rounded-xl border border-line p-2">
                  <span className="w-5 text-center text-sm font-semibold text-ink-3">{i + 1}</span>
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-2">{p?.image && <img src={p.image} alt="" className="h-full w-full object-cover" />}</div>
                  <span className="flex-1 text-sm font-semibold">{p?.name ?? "(deleted product)"}{p && !p.active && <span className="font-normal text-ink-3"> · hidden</span>}</span>
                  <button type="button" onClick={() => move(i, -1)} aria-label="Move up" className="px-2">↑</button>
                  <button type="button" onClick={() => move(i, 1)} aria-label="Move down" className="px-2">↓</button>
                  <button type="button" onClick={() => setPicked(picked.filter((x) => x !== id))} className="px-2 text-sm text-bad">Remove</button>
                </li>
              );
            })}
          </ol>
        )}
        <input className="input" placeholder="Search products to add..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
        <div className="mt-2 grid max-h-72 gap-1 overflow-y-auto sm:grid-cols-2">
          {matches.map((p) => (
            <button key={p.id} type="button" onClick={() => setPicked([...picked, p.id])}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-2">
              <span className="h-8 w-8 shrink-0 overflow-hidden rounded-md bg-surface-2">{p.image && <img src={p.image} alt="" className="h-full w-full object-cover" />}</span>
              <span className="flex-1">{p.name}</span>
              <span className="text-accent">+ Add</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-2xl border border-line bg-surface p-4">
        <legend className="px-1 text-sm font-semibold text-ink-2">3. Text (optional)</legend>
        <div className="field"><label htmlFor="title">Title</label><input id="title" className="input" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Armwrestling starter set" /></div>
        <div className="field"><label htmlFor="caption">Caption</label><textarea id="caption" className="input" rows={3} maxLength={2200} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Shown above the products on the website" /></div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" /> Show on the website</label>
      </fieldset>

      {error && <p className="rounded-xl bg-bad/10 px-4 py-3 text-sm text-bad" role="alert">{error}</p>}
      <div className="flex gap-3">
        {post && (
          <button type="button" className="btn text-bad" onClick={() => { if (confirm("Delete this post from the website? Your Instagram post is not affected.")) start(() => deletePostAction(post.id)); }}>Delete</button>
        )}
        <button className="btn btn-primary ml-auto" disabled={pending || !!busy}>{pending ? "Saving..." : "Save post"}</button>
      </div>
    </form>
  );
}
