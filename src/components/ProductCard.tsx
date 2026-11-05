import Link from "next/link";
import type { Product } from "@/lib/types";
import { money } from "@/lib/site";
import { isSoldOut } from "@/lib/stock";
import { CubeIcon } from "./Icons";

export function cover(p: Product) {
  return p.media.find((m) => m.type === "image")?.url;
}

export default function ProductCard({ p }: { p: Product }) {
  const img = cover(p);
  return (
    <Link href={`/p/${p.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition hover:border-ink-3">
      <div className="relative aspect-square overflow-hidden bg-surface-2">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        ) : (
          <div className="layers flex h-full w-full items-center justify-center text-ink-3">
            <CubeIcon />
          </div>
        )}
        {isSoldOut(p) && (
          <span className="absolute right-2 top-2 rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-bg">Sold out</span>
        )}
        {p.personalizable && (
          <span className="absolute left-2 top-2 rounded-full bg-surface/90 px-2 py-0.5 text-xs font-semibold">Personalised</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="text-sm font-semibold leading-snug">{p.name}</h3>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <p className="font-bold text-accent">{money(p.price)}</p>
          {p.variants.length > 1 && (
            <span className="flex -space-x-1" aria-label={`${p.variants.length} flavours`}>
              {p.variants.slice(0, 5).map((v) => <span key={v.name} className="h-3.5 w-3.5 rounded-full border border-surface" style={{ background: v.hex }} />)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
