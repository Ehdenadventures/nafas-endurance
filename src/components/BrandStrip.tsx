/* eslint-disable @next/next/no-img-element */
import { existsSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import type { Category } from "@/lib/types";

/** Brand logo file, if one was added at public/brands/<slug>.png, .svg, .jpg or .webp. */
function brandLogo(slug: string) {
  for (const ext of ["svg", "png", "webp", "jpg"]) {
    if (existsSync(join(process.cwd(), "public", "brands", `${slug}.${ext}`))) return `/brands/${slug}.${ext}`;
  }
  return null;
}

/** Strip under the banner that slowly scrolls through all brands. Each brand links to its page. */
export default function BrandStrip({ brands }: { brands: Category[] }) {
  if (!brands.length) return null;
  const items = brands.map((b) => ({ ...b, logo: b.logo || brandLogo(b.slug) }));
  // Repeat the list so the strip is always full, then twice more so the loop is seamless.
  const reps = Math.max(1, Math.ceil(8 / items.length));
  const row = Array.from({ length: reps }, () => items).flat();
  const Row = ({ hidden }: { hidden?: boolean }) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden}>
      {row.map((b, k) => (
        <li key={`${b.id}-${k}`} className="flex items-center">
          <Link href={`/c/${b.slug}`} tabIndex={hidden ? -1 : undefined} className="flex h-14 items-center px-8 text-lg font-bold uppercase tracking-[0.18em] text-ink-2 transition hover:text-accent">
            {b.logo ? <img src={b.logo} alt={b.name} className="h-9 w-auto max-w-[160px] object-contain" /> : b.name}
          </Link>
          <span className="text-pink" aria-hidden="true">✦</span>
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-label="Our brands" className="brand-strip group -mx-4 mt-6 overflow-hidden border-y border-line bg-surface sm:mx-0 sm:rounded-2xl sm:border">
      <div className="brand-track flex w-max group-hover:[animation-play-state:paused]">
        <Row />
        <Row hidden />
      </div>
    </section>
  );
}
