import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import AddToCart from "@/components/AddToCart";
import ProductCard, { cover } from "@/components/ProductCard";
import ProductMedia from "@/components/ProductMedia";
import { ColourProvider } from "@/components/ColourContext";
import { WhatsAppIcon } from "@/components/Icons";
import { categoryPath, categoryTree, getCategories, getProductBySlug, getProducts } from "@/lib/data";
import { money, site, whatsappLink } from "@/lib/site";
import { isSoldOut, packStock, priceRange, stockFor } from "@/lib/stock";
import ProductTabs from "@/components/ProductTabs";
import { Rich, plainText } from "@/components/RichText";
import FeatureBadges from "@/components/FeatureBadges";

export const revalidate = 60;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return {};
  const img = cover(p);
  return { title: p.name, description: plainText(p.description), openGraph: img ? { images: [img] } : undefined };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [p, cats, all] = await Promise.all([getProductBySlug(slug), getCategories(), getProducts()]);
  if (!p) notFound();
  const path = categoryPath(cats, p.category_id);
  // Same category first, then the rest of the brand.
  const brand = path[0] ? categoryTree(cats, path[0].id) : new Set<string>();
  const related = [
    ...all.filter((x) => x.category_id === p.category_id && x.id !== p.id),
    ...all.filter((x) => x.category_id !== p.category_id && x.category_id && brand.has(x.category_id)),
  ].slice(0, 4);
  const [low, high] = priceRange(p);
  // Start on a flavour and packaging that are in stock.
  const firstColour = p.variants.find((v) => p.packages.length ? p.packages.some((pk) => packStock(pk, v.name) !== 0) : v.stock !== 0)?.name ?? "";
  const firstPack = p.packages.find((pk) => stockFor(p, firstColour, pk.name) !== 0)?.name ?? p.packages[0]?.name ?? "";
  const print = p.kind === "print";
  const ask = whatsappLink(`Hi ${site.name}, I have a question about "${p.name}" (${site.url}/p/${p.slug})`);

  return (
    <div className="pt-8">
      <nav className="text-sm text-ink-3" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-ink">Home</Link>
        {path.map((c) => <span key={c.id}> / <Link href={`/c/${c.slug}`} className="hover:text-ink">{c.name}</Link></span>)}
      </nav>
      <ColourProvider initial={firstColour} initialPack={firstPack}>
      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <ProductMedia media={p.media} name={p.name} product={p} />
        <div>
          <h1 className="border-b-2 border-accent pb-3 text-3xl font-extrabold uppercase tracking-tight text-accent">{p.name}</h1>
          <p className="mt-4 text-2xl font-bold text-accent">{low === high ? money(low) : `${money(low)} – ${money(high)}`}</p>
          <p className="mt-4 whitespace-pre-line text-ink-2"><Rich text={p.description} /></p>
          {!p.variants.length && p.stock !== null && p.stock > 0 && p.stock <= 5 && (
            <p className="mt-3 text-sm font-semibold text-bad">Only {p.stock} left</p>
          )}
          {isSoldOut(p) ? (
            <p className="mt-6 rounded-xl bg-surface-2 px-4 py-3 font-semibold">Sold out for now. Message us on WhatsApp and we will tell you when it is back.</p>
          ) : (
            <AddToCart productId={p.id} slug={p.slug} name={p.name} price={p.price} image={cover(p)} personalizable={p.personalizable} stock={p.stock} colours={p.variants} packages={p.packages} kind={p.kind} />
          )}
          <ul className="mt-6 space-y-1 text-sm text-ink-2">
            <li>• Pay cash on delivery</li>
            <li>• Delivery all over Lebanon with Wakilni</li>
            {print
              ? <li>• Want another colour or size? Ask us on WhatsApp</li>
              : <li>• Not sure which gel fits your race? Ask us on WhatsApp</li>}
          </ul>
          {ask && (
            <a href={ask} target="_blank" rel="noopener noreferrer" className="btn mt-4">
              <WhatsAppIcon /> Ask about this item
            </a>
          )}
        </div>
      </div>
      </ColourProvider>
      {!print && <FeatureBadges features={p.features} />}
      <ProductTabs details={p.details} />
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-center text-xl font-extrabold uppercase text-accent">You might be interested in</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {related.map((x) => <ProductCard key={x.id} p={x} />)}
          </div>
        </section>
      )}
    </div>
  );
}
