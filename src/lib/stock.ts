import { FEATURES, type Detail, type FeatureKey, type Package, type PickedOption, type Product, type ProductOption, type Variant } from "./types";

/** Safe to use in the browser and on the server. null = no limit. */
export const hasColours = (p: Pick<Product, "variants">) => p.variants.length > 0;

type Stocked = Pick<Product, "stock" | "variants" | "packages">;

/** Stock of one packaging in one flavour. null = no limit. */
export const packStock = (pk: Package, colour = ""): number | null => pk.stock?.[colour] ?? null;

/** How many are left of a flavour (and packaging, when the product has packaging). null = no limit. */
export function stockFor(p: Stocked, colour?: string, pack?: string): number | null {
  if (hasColours(p) && !p.variants.some((x) => x.name === colour)) return 0;
  if (p.packages.length) {
    const pk = p.packages.find((x) => x.name === pack);
    return pk ? packStock(pk, hasColours(p) ? colour : "") : 0;
  }
  if (hasColours(p)) return p.variants.find((x) => x.name === colour)!.stock;
  return p.stock;
}

/** Nothing left in any flavour or packaging. */
export function isSoldOut(p: Stocked) {
  const flavours = hasColours(p) ? p.variants.map((v) => v.name) : [""];
  if (p.packages.length) return p.packages.every((pk) => flavours.every((f) => packStock(pk, f) === 0));
  return hasColours(p) ? p.variants.every((v) => v.stock === 0) : p.stock === 0;
}

export function cleanVariants(raw: unknown): Variant[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Variant[] = [];
  for (const r of raw as Record<string, unknown>[]) {
    const name = String(r?.name ?? "").trim().slice(0, 40);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    const hex = /^#[0-9a-f]{6}$/i.test(String(r?.hex)) ? String(r.hex) : "#888888";
    const s = r?.stock;
    const stock = s === null || s === undefined || s === "" ? null : Math.max(0, Math.floor(Number(s)) || 0);
    const image = typeof r?.image === "string" && /^https?:\/\//.test(r.image) ? r.image : undefined;
    const extra = money2(r?.extra);
    const v: Variant = { name, hex, stock };
    if (image) v.image = image;
    if (extra > 0) v.extra = extra;
    out.push(v);
  }
  return out.slice(0, 30);
}

export function cleanPackages(raw: unknown): Package[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Package[] = [];
  for (const r of raw as Record<string, unknown>[]) {
    const name = String(r?.name ?? "").trim().slice(0, 40);
    const price = Math.round(Number(r?.price) * 100) / 100;
    if (!name || seen.has(name.toLowerCase()) || !(price >= 0)) continue;
    seen.add(name.toLowerCase());
    const units = Math.max(1, Math.min(1000, Math.floor(Number(r?.units)) || 1));
    const images: Record<string, string> = {};
    if (r?.images && typeof r.images === "object")
      for (const [k, v] of Object.entries(r.images as Record<string, unknown>))
        if (typeof v === "string" && /^https?:\/\//.test(v)) images[k.slice(0, 40)] = v;
    const stock: Record<string, number | null> = {};
    if (r?.stock && typeof r.stock === "object")
      for (const [k, v] of Object.entries(r.stock as Record<string, unknown>))
        if (v !== null && v !== undefined && v !== "") stock[k.slice(0, 40)] = Math.max(0, Math.floor(Number(v)) || 0);
    const pk: Package = { name, price, units };
    if (Object.keys(images).length) pk.images = images;
    if (Object.keys(stock).length) pk.stock = stock;
    out.push(pk);
  }
  return out.slice(0, 10);
}

export function cleanDetails(raw: unknown): Detail[] {
  if (!Array.isArray(raw)) return [];
  return (raw as Record<string, unknown>[])
    .map((r) => ({ title: String(r?.title ?? "").trim().slice(0, 40), body: String(r?.body ?? "").trim().slice(0, 8000) }))
    .filter((d) => d.title)
    .slice(0, 12);
}

const featureKeys = new Set<string>(FEATURES.map((f) => f.key));
export const cleanFeatures = (raw: unknown): FeatureKey[] =>
  Array.isArray(raw) ? ([...new Set(raw.map(String))].filter((k) => featureKeys.has(k)) as FeatureKey[]) : [];

/** The photo for a flavour + packaging: the packaging's photo for that flavour, then its photo for any flavour,
 *  then the flavour's own photo. */
export function photoFor(p: Pick<Product, "variants" | "packages">, colour: string, pack: string): string | undefined {
  const imgs = p.packages.find((x) => x.name === pack)?.images;
  return imgs?.[colour] ?? imgs?.[""] ?? p.variants.find((v) => v.name === colour)?.image;
}

/** A price extra: 0 or more, rounded to cents. Anything else = 0. */
function money2(v: unknown) {
  const n = Math.round(Number(v) * 100) / 100;
  return n > 0 && n < 100000 ? n : 0;
}

/** Price options (e.g. Filament type: PLA +0, PETG +3). Options without choices are dropped. */
export function cleanOptions(raw: unknown): ProductOption[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: ProductOption[] = [];
  for (const r of raw as Record<string, unknown>[]) {
    const name = String(r?.name ?? "").trim().slice(0, 40);
    if (!name || seen.has(name.toLowerCase())) continue;
    const names = new Set<string>();
    const choices = (Array.isArray(r?.choices) ? (r.choices as Record<string, unknown>[]) : [])
      .map((c) => ({ name: String(c?.name ?? "").trim().slice(0, 40), extra: money2(c?.extra) }))
      .filter((c) => c.name && !names.has(c.name.toLowerCase()) && names.add(c.name.toLowerCase()))
      .slice(0, 20);
    if (!choices.length) continue;
    seen.add(name.toLowerCase());
    out.push({ name, choices });
  }
  return out.slice(0, 5);
}

type Priced = Pick<Product, "price" | "packages" | "variants"> & { options?: ProductOption[] };

/** Price of one item for the picks: packaging price (or the product price), plus the colour's extra,
 *  plus the extra of each option picked. Returns null if an option is missing or unknown. */
export function unitPrice(p: Priced, colour: string | undefined, pack: string | undefined, picks: PickedOption[] = []): number | null {
  const pk = p.packages.find((x) => x.name === pack);
  let price = pk ? pk.price : p.price;
  price += p.variants.find((v) => v.name === colour)?.extra ?? 0;
  for (const o of p.options ?? []) {
    const c = o.choices.find((x) => x.name === picks.find((k) => k.name === o.name)?.value);
    if (!c) return null;
    price += c.extra;
  }
  return Math.round(price * 100) / 100;
}

/** Lowest and highest price a customer can pay for one item. */
export function priceRange(p: Priced): [number, number] {
  const prices = p.packages.length ? p.packages.map((x) => x.price) : [p.price];
  const extras = p.variants.map((v) => v.extra ?? 0);
  let low = Math.min(...prices) + (extras.length ? Math.min(...extras) : 0);
  let high = Math.max(...prices) + (extras.length ? Math.max(...extras) : 0);
  for (const o of p.options ?? []) {
    low += Math.min(...o.choices.map((c) => c.extra));
    high += Math.max(...o.choices.map((c) => c.extra));
  }
  return [Math.round(low * 100) / 100, Math.round(high * 100) / 100];
}

