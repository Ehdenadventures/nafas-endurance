"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { BannerSettings, SlideBackground } from "@/lib/types";

export type ProductSlide = { id: string; href: string; name: string; price: string; image: string; brand: string };

/** This slide's own picture, else the default one (for the main slide only when "all" is on). */
export function slideBackground(b: BannerSettings | undefined, key: string): SlideBackground | undefined {
  if (!b) return undefined;
  if (b.slides[key]?.image) return b.slides[key];
  if (key === "main" && !b.all) return undefined;
  return b.image ? b : undefined;
}

/**
 * Home banner that rotates on its own: the main slide first, then one slide per product that has a photo.
 * Pauses while hovered or touched, has arrows and dots, swipes on phones, and stays still for people who
 * turned off motion in their system settings.
 */
/** The picture set in admin > Banner, faded to the chosen strength. */
export function Backdrop({ bg }: { bg?: SlideBackground }) {
  if (!bg?.image) return null;
  return (
    <img src={bg.image} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      style={{ opacity: bg.opacity / 100, objectPosition: `${bg.x}% ${bg.y}%` }} />
  );
}

export default function HeroSlider({ main, products, interval = 5000, background }: { main: React.ReactNode; products: ProductSlide[]; interval?: number; background?: BannerSettings }) {
  const count = 1 + products.length;
  const [i, setI] = useState(0);
  const paused = useRef(false);
  const touchX = useRef<number | null>(null);
  const go = useCallback((n: number) => setI(((n % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => { if (!paused.current && !document.hidden) setI((x) => (x + 1) % count); }, interval);
    return () => clearInterval(t);
  }, [count, interval]);

  return (
    <section
      className="hero-dark relative -mx-4 mt-6 overflow-hidden border-line bg-[#082161] text-white sm:mx-0 sm:rounded-3xl sm:border"
      aria-roledescription="carousel" aria-label="Featured"
      onMouseEnter={() => (paused.current = true)} onMouseLeave={() => (paused.current = false)}
      onTouchStart={(e) => { paused.current = true; touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const start = touchX.current; touchX.current = null; paused.current = false;
        if (start === null) return;
        const dx = e.changedTouches[0].clientX - start;
        if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="flex transition-transform duration-700 ease-out motion-reduce:transition-none" style={{ transform: `translateX(-${i * 100}%)` }}>
        <div className="relative w-full shrink-0" aria-hidden={i !== 0} inert={i !== 0}>
          <Backdrop bg={slideBackground(background, "main")} />
          <div className="relative">{main}</div>
        </div>
        {products.map((p, k) => (
          <div key={p.href} className="relative w-full shrink-0" aria-hidden={i !== k + 1} inert={i !== k + 1} aria-roledescription="slide" aria-label={`${k + 2} of ${count}`}>
            <Backdrop bg={slideBackground(background, p.id)} />
            <div className="relative grid min-h-[420px] items-center gap-6 px-6 py-10 sm:px-12 md:grid-cols-2">
              <div className="order-2 md:order-1">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#ffc62e]">{p.brand}</p>
                <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">{p.name}</h2>
                <p className="mt-3 text-2xl font-bold text-[#ffc62e]">{p.price}</p>
                <Link href={p.href} className="btn btn-pink mt-6">Shop now</Link>
              </div>
              <div className="order-1 flex justify-center md:order-2">
                <img src={p.image} alt={p.name} className="max-h-[300px] w-auto rounded-2xl object-contain sm:max-h-[360px]" loading={k === 0 ? "eager" : "lazy"} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button type="button" aria-label="Previous" onClick={() => go(i - 1)}
            className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-xl hover:bg-white/30 sm:flex">‹</button>
          <button type="button" aria-label="Next" onClick={() => go(i + 1)}
            className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-xl hover:bg-white/30 sm:flex">›</button>
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
            {Array.from({ length: count }, (_, k) => (
              <button key={k} type="button" aria-label={`Show slide ${k + 1}`} aria-current={k === i}
                onClick={() => go(k)} className={`h-2.5 rounded-full transition-all ${k === i ? "w-7 bg-[#ffc62e]" : "w-2.5 bg-white/40 hover:bg-white/70"}`} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
