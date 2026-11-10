import Link from "next/link";
import ProductCard, { cover } from "@/components/ProductCard";
import HeroSlider from "@/components/HeroSlider";
import BrandStrip from "@/components/BrandStrip";
import Logo from "@/components/Logo";
import { brandsOf, categoryTree, getBanner, getCategories, getProducts } from "@/lib/data";
import { money, site } from "@/lib/site";

export const revalidate = 60;

export default async function Home() {
  const [cats, products, banner] = await Promise.all([getCategories(), getProducts(), getBanner()]);
  const top = cats.filter((c) => !c.parent_id);
  const brands = brandsOf(cats);
  const brandIds = new Set(brands.map((b) => b.id));
  // The nearest brand above a product's category (or its main category if none is marked as a brand).
  const brandOf = (categoryId: string | null) => {
    let c = cats.find((x) => x.id === categoryId);
    while (c && !brandIds.has(c.id) && c.parent_id) c = cats.find((x) => x.id === c!.parent_id);
    return c && brandIds.has(c.id) ? c.name : "";
  };
  // One banner slide per product that has a photo, up to 6.
  const slides = products
    .map((p) => ({ p, image: cover(p) }))
    .filter((x): x is { p: typeof x.p; image: string } => !!x.image)
    .slice(0, 6)
    .map(({ p, image }) => ({ href: `/p/${p.slug}`, name: p.name, price: money(p.price), image, brand: brandOf(p.category_id) }));
  return (
    <>
      <HeroSlider
        background={banner}
        products={slides}
        main={
          <div className="min-h-[420px] px-6 py-12 sm:px-12 sm:py-16">
            <div className="flex items-center justify-between gap-8">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#ffc62e]">{site.tagline}</p>
                  <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl">
                    Fuel every kilometre. <span className="highlight">Breathe, push, finish.</span>
                  </h1>
                  <p className="mt-5 max-w-xl text-[#d3dcf3]">Energy gels and race nutrition from trusted brands, starting with Ultimate Italia. Order online and pay cash when it arrives, anywhere in Lebanon.</p>
                  <p lang="ar" dir="rtl" className="mt-2 w-fit text-[#d3dcf3]" style={{ fontFamily: "'Readex Pro', sans-serif" }}>
                    اطلب أونلاين واِدفع عند الاستلام
                  </p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link href={`/c/${top[0]?.slug ?? ""}`} className="btn btn-pink">Shop now</Link>
                    <Link href="/ig" className="btn btn-ghost-dark">Shop our Instagram</Link>
                  </div>
                </div>
                <div className="hidden shrink-0 lg:block"><Logo height={96} /></div>
              </div>
          </div>
        }
      />

      <BrandStrip brands={brands} />

      <section className="mt-12 grid gap-4 sm:grid-cols-3" aria-label="Brands">
        {brands.map((c) => {
          const ids = categoryTree(cats, c.id);
          const n = products.filter((p) => p.category_id && ids.has(p.category_id)).length;
          const subs = cats.filter((s) => s.parent_id === c.id);
          return (
            <Link key={c.id} href={`/c/${c.slug}`} className="rounded-2xl border border-line bg-surface p-5 transition hover:border-ink-3">
              <h2 className="text-xl font-bold">{c.name}</h2>
              <p className="mt-1 text-sm text-ink-2">{c.description}</p>
              <p className="mt-3 text-xs text-ink-3">{subs.map((s) => s.name).join(" · ")}</p>
              <p className="mt-3 text-sm font-semibold text-accent">{n} products →</p>
            </Link>
          );
        })}
      </section>

      {top.map((c) => {
        const ids = categoryTree(cats, c.id);
        const items = products.filter((p) => p.category_id && ids.has(p.category_id)).slice(0, 4);
        if (!items.length) return null;
        return (
          <section key={c.id} className="mt-12">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-2xl font-bold">{c.name}</h2>
              <Link href={`/c/${c.slug}`} className="text-sm font-semibold text-accent">See all</Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              {items.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          </section>
        );
      })}
    </>
  );
}
