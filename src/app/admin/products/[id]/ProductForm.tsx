"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { DEFAULT_DETAILS, FEATURES, type FeatureKey, type Media, type Product } from "@/lib/types";
import { createUploadUrl, deleteProductAction, saveProductAction } from "../../actions";

type Opt = { id: string; label: string };
type ColourRow = { name: string; hex: string; stock: string; image: string };
type PackRow = { name: string; price: string; units: string };
type DetailRow = { title: string; body: string };

/** Saved tabs first, then any standard tab not used yet (empty tabs are hidden on the shop). */
function startDetails(saved: DetailRow[]): DetailRow[] {
  const have = new Set(saved.map((d) => d.title.toLowerCase()));
  return [...saved, ...DEFAULT_DETAILS.filter((t) => !have.has(t.toLowerCase())).map((title) => ({ title, body: "" }))];
}

const PRESETS: [string, string][] = [
  ["Orange", "#f28c28"], ["Lemon", "#f2d32c"], ["Cola", "#5a2e1b"], ["Berries", "#8e2a6b"], ["Strawberry", "#d93445"],
  ["Apple", "#7cc242"], ["Mint", "#3fbf9f"], ["Tropical", "#ffb347"], ["Neutral", "#d9d4c7"], ["Caffeine", "#3b2a20"],
];

export default function ProductForm({ product, categories, uploads }: { product: Product | null; categories: Opt[]; uploads: boolean }) {
  const [f, setF] = useState({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    description: product?.description ?? "",
    price: product ? String(product.price) : "",
    category_id: product?.category_id ?? categories[0]?.id ?? "",
    active: product?.active ?? true,
    personalizable: product?.personalizable ?? false,
    sort: String(product?.sort ?? 0),
    stock: product?.stock == null ? "" : String(product.stock),
  });
  const [media, setMedia] = useState<Media[]>(product?.media ?? []);
  const [colours, setColours] = useState<ColourRow[]>(
    (product?.variants ?? []).map((v) => ({ name: v.name, hex: v.hex, stock: v.stock == null ? "" : String(v.stock), image: v.image ?? "" })),
  );
  const [packs, setPacks] = useState<PackRow[]>((product?.packages ?? []).map((x) => ({ name: x.name, price: String(x.price), units: String(x.units) })));
  const setPack = (i: number, patch: Partial<PackRow>) => setPacks((c) => c.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const [details, setDetails] = useState<DetailRow[]>(startDetails(product?.details ?? []));
  const setDetail = (i: number, patch: Partial<DetailRow>) => setDetails((c) => c.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const [features, setFeatures] = useState<FeatureKey[]>(product?.features ?? []);
  const images = media.filter((m) => m.type === "image");
  const setColour = (i: number, patch: Partial<ColourRow>) => setColours((c) => c.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const addColour = (name = "", hex = "#888888") => {
    if (name && colours.some((c) => c.name.toLowerCase() === name.toLowerCase())) return;
    setColours((c) => [...c, { name, hex, stock: "", image: "" }]);
  };
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value });

  const kindOf = (name: string, mime = ""): Media["type"] =>
    mime.startsWith("video") || /\.(mp4|webm|mov|m4v)$/i.test(name) ? "video" : "image";

  async function upload(files: FileList | null) {
    if (!files) return;
    setError("");
    for (const file of Array.from(files)) {
      if (file.size > 50 * 1024 * 1024) { setError(`${file.name} is over 50 MB.`); continue; }
      setBusy(`Uploading ${file.name}...`);
      const res = await createUploadUrl(file.name);
      if ("error" in res) { setError(res.error); break; }
      const body = new FormData();
      body.append("cacheControl", "31536000");
      body.append("", file);
      const put = await fetch(res.uploadUrl, { method: "PUT", body, headers: { "x-upsert": "false" } });
      if (!put.ok) { setError(`Upload failed for ${file.name} (${put.status}).`); break; }
      setMedia((m) => [...m, { type: kindOf(file.name, file.type), url: res.publicUrl }]);
    }
    setBusy("");
  }

  const move = (i: number, d: number) =>
    setMedia((m) => {
      const j = i + d;
      if (j < 0 || j >= m.length) return m;
      const c = [...m];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      const res = await saveProductAction({
        id: product?.id, name: f.name, slug: f.slug, description: f.description, price: Number(f.price),
        category_id: f.category_id || null, active: f.active, personalizable: f.personalizable, sort: Number(f.sort),
        stock: colours.length || f.stock.trim() === "" ? null : Number(f.stock),
        variants: colours.filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), hex: c.hex, stock: c.stock.trim() === "" ? null : Number(c.stock), image: media.some((m) => m.url === c.image) ? c.image : undefined })),
        packages: packs.filter((x) => x.name.trim()).map((x) => ({ name: x.name.trim(), price: x.price.trim() === "" ? NaN : Number(x.price), units: Number(x.units) || 1 })),
        details: details.filter((d) => d.title.trim() && d.body.trim()),
        features,
        media,
      });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{product ? "Edit product" : "New product"}</h1>
        <Link href="/admin/products" className="text-sm text-ink-2 hover:text-ink">← All products</Link>
      </div>
      <div className="field"><label htmlFor="name">Name</label><input id="name" className="input" value={f.name} onChange={set("name")} required /></div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="field"><label htmlFor="price">Price (USD)</label><input id="price" className="input" type="number" min="0" step="0.01" inputMode="decimal" value={packs.length ? "" : f.price} onChange={set("price")} required={!packs.length} disabled={packs.length > 0} placeholder={packs.length ? "Per packaging below" : ""} /></div>
        <div className="field"><label htmlFor="cat">Category</label>
          <select id="cat" className="input" value={f.category_id} onChange={set("category_id")}>
            <option value="">No category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor="stock">Stock</label><input id="stock" className="input" type="number" min="0" step="1" inputMode="numeric" value={colours.length ? "" : f.stock} onChange={set("stock")} placeholder={colours.length ? "Per colour below" : "No limit"} disabled={colours.length > 0} />
          <span className="text-xs text-ink-3">{colours.length ? "This product has flavours, so stock is set for each flavour below." : "How many you have ready. Empty = no limit (made to order). 0 = sold out."}</span>
        </div>
      </div>
      <fieldset className="rounded-2xl border border-line bg-surface p-4">
        <legend className="px-1 text-sm font-semibold text-ink-2">Flavours</legend>
        <p className="mb-3 text-xs text-ink-3">Optional. Add flavours if customers can choose one. Each flavour has its own stock (empty = no limit, 0 = sold out). {images.length ? "Tap a photo under a flavour to show it when that flavour is picked." : "Upload photos below, then you can link a photo to each flavour."}</p>
        {colours.length > 0 && (
          <div className="mb-3 space-y-3">
            {colours.map((c, i) => (
              <div key={i}>
              <div className="grid grid-cols-[3rem_minmax(0,1fr)_7.5rem_auto] items-center gap-2">
                <input type="color" aria-label="Flavour colour" value={c.hex} onChange={(e) => setColour(i, { hex: e.target.value })} className="h-10 w-12 cursor-pointer rounded-lg border border-line bg-surface p-1" />
                <input className="input" placeholder="Flavour name" aria-label="Flavour name" value={c.name} maxLength={40} onChange={(e) => setColour(i, { name: e.target.value })} />
                <input className="input" type="number" min="0" step="1" inputMode="numeric" placeholder="No limit" aria-label={`Stock for ${c.name || "this flavour"}`} value={c.stock} onChange={(e) => setColour(i, { stock: e.target.value })} />
                <button type="button" className="px-2 text-sm text-bad" onClick={() => setColours(colours.filter((_, j) => j !== i))}>Remove</button>
              </div>
              {images.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5 pl-14">
                  <span className="mr-1 text-xs text-ink-3">Photo:</span>
                  {images.map((m, k) => (
                    <button key={m.url} type="button" onClick={() => setColour(i, { image: c.image === m.url ? "" : m.url })}
                      aria-label={`Use photo ${k + 1} for ${c.name || "this flavour"}`} aria-pressed={c.image === m.url}
                      className={`h-9 w-9 shrink-0 overflow-hidden rounded-md border-2 ${c.image === m.url ? "border-accent" : "border-transparent opacity-60 hover:opacity-100"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {PRESETS.filter(([n]) => !colours.some((c) => c.name.toLowerCase() === n.toLowerCase())).map(([n, h]) => (
            <button key={n} type="button" onClick={() => addColour(n, h)} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-sm hover:border-ink-3">
              <span className="h-3.5 w-3.5 rounded-full border border-line" style={{ background: h }} /> {n}
            </button>
          ))}
          <button type="button" onClick={() => addColour()} className="rounded-full border border-dashed border-ink-3 px-3 py-1 text-sm">+ Other flavour</button>
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-line bg-surface p-4">
        <legend className="px-1 text-sm font-semibold text-ink-2">Packaging</legend>
        <p className="mb-3 text-xs text-ink-3">Optional. Add one row for each way you sell it, each with its own price, e.g. &quot;1 gel&quot; at 2.20 and &quot;Box of 24&quot; at 52.80. &quot;Pieces&quot; is how many single items it takes from stock (a box of 24 = 24). Leave empty to sell one by one at the price above.</p>
        {packs.length > 0 && (
          <div className="mb-3 space-y-2">
            <div className="grid grid-cols-[minmax(0,1fr)_6rem_5rem_auto] gap-2 text-xs text-ink-3"><span>Name</span><span>Price (USD)</span><span>Pieces</span><span /></div>
            {packs.map((x, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_6rem_5rem_auto] items-center gap-2">
                <input className="input" placeholder="e.g. Box of 24" aria-label="Packaging name" maxLength={40} value={x.name} onChange={(e) => setPack(i, { name: e.target.value })} />
                <input className="input" type="number" min="0" step="0.01" inputMode="decimal" aria-label={`Price for ${x.name || "this packaging"}`} value={x.price} onChange={(e) => setPack(i, { price: e.target.value })} />
                <input className="input" type="number" min="1" step="1" inputMode="numeric" aria-label={`Pieces in ${x.name || "this packaging"}`} value={x.units} onChange={(e) => setPack(i, { units: e.target.value })} />
                <button type="button" className="px-2 text-sm text-bad" onClick={() => setPacks(packs.filter((_, j) => j !== i))}>Remove</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {!packs.length && <button type="button" onClick={() => setPacks([{ name: "1 gel", price: f.price, units: "1" }, { name: "Box of 24", price: "", units: "24" }])} className="rounded-full border border-line px-3 py-1 text-sm hover:border-ink-3">1 gel + Box of 24</button>}
          <button type="button" onClick={() => setPacks([...packs, { name: "", price: "", units: "1" }])} className="rounded-full border border-dashed border-ink-3 px-3 py-1 text-sm">+ Add packaging</button>
        </div>
      </fieldset>

      <div className="field"><label htmlFor="desc">Short description (next to the photo)</label><textarea id="desc" className="input" rows={4} value={f.description} onChange={set("description")} /></div>

      <fieldset className="rounded-2xl border border-line bg-surface p-4">
        <legend className="px-1 text-sm font-semibold text-ink-2">Badges</legend>
        <p className="mb-3 text-xs text-ink-3">Tick what applies. The others show faded on the product page. Leave all empty to hide the badges.</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {FEATURES.map((x) => (
            <label key={x.key} className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={features.includes(x.key)}
                onChange={(e) => setFeatures(e.target.checked ? [...features, x.key] : features.filter((k) => k !== x.key))} />
              {x.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-line bg-surface p-4">
        <legend className="px-1 text-sm font-semibold text-ink-2">Information tabs</legend>
        <p className="mb-3 text-xs text-ink-3">Shown as tabs under the product. Empty tabs are hidden. For a table (like nutritional values), put | between columns, one row per line, e.g. <code>Energy | 100 kcal | 50 kcal</code>. The first row is the header.</p>
        <div className="space-y-3">
          {details.map((d, i) => (
            <details key={i} className="rounded-xl border border-line">
              <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">{d.title || "New tab"}{d.body.trim() ? "" : <span className="font-normal text-ink-3"> (empty)</span>}</summary>
              <div className="space-y-2 px-3 pb-3">
                <div className="flex gap-2">
                  <input className="input flex-1" aria-label="Tab title" maxLength={40} value={d.title} onChange={(e) => setDetail(i, { title: e.target.value })} />
                  <button type="button" className="px-2 text-sm text-bad" onClick={() => setDetails(details.filter((_, j) => j !== i))}>Remove</button>
                </div>
                <textarea className="input" rows={5} aria-label={`${d.title || "Tab"} text`} value={d.body} onChange={(e) => setDetail(i, { body: e.target.value })} />
              </div>
            </details>
          ))}
        </div>
        <button type="button" onClick={() => setDetails([...details, { title: "", body: "" }])} className="mt-3 rounded-full border border-dashed border-ink-3 px-3 py-1 text-sm">+ Add a tab</button>
      </fieldset>

      <fieldset className="rounded-2xl border border-line bg-surface p-4">
        <legend className="px-1 text-sm font-semibold text-ink-2">Photos and videos</legend>
        <p className="mb-3 text-xs text-ink-3">The first photo is the cover. Videos (MP4) play on a loop like a GIF.</p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {media.map((m, i) => (
            <div key={m.url + i} className="overflow-hidden rounded-xl border border-line">
              <div className="aspect-square bg-surface-2">
                {m.type === "video"
                  ? <video src={m.url} className="h-full w-full object-cover" muted loop autoPlay playsInline />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={m.url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex justify-between p-1 text-sm">
                <button type="button" onClick={() => move(i, -1)} aria-label="Move earlier" className="px-2">←</button>
                <button type="button" onClick={() => setMedia(media.filter((_, j) => j !== i))} className="px-2 text-bad">Remove</button>
                <button type="button" onClick={() => move(i, 1)} aria-label="Move later" className="px-2">→</button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          {uploads && (
            <label className="btn cursor-pointer">
              Upload files
              <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
            </label>
          )}
          <input className="input flex-1" placeholder="...or paste an image/video URL" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button type="button" className="btn" onClick={() => { if (/^https?:\/\//.test(url)) { setMedia([...media, { type: kindOf(url), url }]); setUrl(""); } }}>Add URL</button>
        </div>
        {busy && <p className="mt-2 text-sm text-ink-2">{busy}</p>}
      </fieldset>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2"><input type="checkbox" checked={f.active} onChange={set("active")} className="h-4 w-4 accent-[var(--accent)]" /> Show on the shop</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={f.personalizable} onChange={set("personalizable")} className="h-4 w-4 accent-[var(--accent)]" /> Customer adds a note</label>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-ink-2">Advanced</summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="field"><label htmlFor="slug">Link (leave empty to make one from the name)</label><input id="slug" className="input" value={f.slug} onChange={set("slug")} placeholder="egg-grip" /></div>
          <div className="field"><label htmlFor="sort">Order in its category (lower shows first)</label><input id="sort" className="input" type="number" value={f.sort} onChange={set("sort")} /></div>
        </div>
      </details>
      {error && <p className="rounded-xl bg-bad/10 px-4 py-3 text-sm text-bad" role="alert">{error}</p>}
      <div className="flex gap-3">
        {product && (
          <button type="button" className="btn text-bad" onClick={() => { if (confirm(`Delete "${product.name}"? This can't be undone.`)) start(() => deleteProductAction(product.id)); }}>Delete</button>
        )}
        <button className="btn btn-primary ml-auto" disabled={pending || !!busy}>{pending ? "Saving..." : "Save product"}</button>
      </div>
    </form>
  );
}
