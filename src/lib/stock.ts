import { FEATURES, type Detail, type FeatureKey, type Package, type Product, type Variant } from "./types";

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
    out.push(image ? { name, hex, stock, image } : { name, hex, stock });
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

/** Lowest and highest price a customer can pay for one item. */
export function priceRange(p: Pick<Product, "price" | "packages">): [number, number] {
  if (!p.packages.length) return [p.price, p.price];
  const prices = p.packages.map((x) => x.price);
  return [Math.min(...prices), Math.max(...prices)];
}
