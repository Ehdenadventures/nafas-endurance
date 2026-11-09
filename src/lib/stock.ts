import { FEATURES, type Detail, type FeatureKey, type Package, type Product, type Variant } from "./types";

/** Safe to use in the browser and on the server. null = no limit. */
export const hasColours = (p: Pick<Product, "variants">) => p.variants.length > 0;

export function stockFor(p: Pick<Product, "stock" | "variants">, colour?: string): number | null {
  if (hasColours(p)) {
    const v = p.variants.find((x) => x.name === colour);
    return v ? v.stock : 0;
  }
  return p.stock;
}

export function isSoldOut(p: Pick<Product, "stock" | "variants">) {
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
    out.push({ name, price, units });
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

/** Lowest and highest price a customer can pay for one item. */
export function priceRange(p: Pick<Product, "price" | "packages">): [number, number] {
  if (!p.packages.length) return [p.price, p.price];
  const prices = p.packages.map((x) => x.price);
  return [Math.min(...prices), Math.max(...prices)];
}
