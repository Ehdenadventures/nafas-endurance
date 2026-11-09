import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProductCard from "@/components/ProductCard";
import { categoryPath, categoryTree, getCategories, getCategoryBySlug, getProducts } from "@/lib/data";

export const revalidate = 60;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCategoryBySlug((await params).slug);
  return c ? { title: c.name, description: c.description || undefined } : {};
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const [cat, cats, products] = await Promise.all([getCategoryBySlug(slug), getCategories(), getProducts()]);
  if (!cat) notFound();
  const path = categoryPath(cats, cat.id).slice(0, -1);
  const subs = cats.filter((c) => c.parent_id === cat.id);
  // Products right in this category first, then one section per subcategory with everything inside it.
  const groups = [
    { c: cat, items: products.filter((p) => p.category_id === cat.id) },
    ...subs.map((s) => {
      const ids = categoryTree(cats, s.id);
      return { c: s, items: products.filter((p) => p.category_id && ids.has(p.category_id)) };
    }),
  ].filter((g) => g.items.length);

  return (
    <div className="pt-8">
      <nav className="text-sm text-ink-3" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-ink">Home</Link>
        {path.map((c) => <span key={c.id}> / <Link href={`/c/${c.slug}`} className="hover:text-ink">{c.name}</Link></span>)}
      </nav>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{cat.name}</h1>
      {cat.description && <p className="mt-1 text-ink-2">{cat.description}</p>}

      {subs.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {subs.map((s) => (
            <a key={s.id} href={`#${s.slug}`} className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:border-ink-3">{s.name}</a>
          ))}
        </div>
      )}

      {groups.map(({ c, items }) => (
        <section key={c.id} id={c.slug} className="mt-10 scroll-mt-28">
          {c.id !== cat.id && (
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <h2 className="text-xl font-bold">{c.name}</h2>
              {cats.some((x) => x.parent_id === c.id) && <Link href={`/c/${c.slug}`} className="text-sm font-semibold text-accent">See all</Link>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {items.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      ))}
      {!groups.length && <p className="mt-10 text-ink-3">No items here yet.</p>}
    </div>
  );
}
