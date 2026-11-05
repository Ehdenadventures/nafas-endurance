import type { Product, Variant } from "./types";

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
