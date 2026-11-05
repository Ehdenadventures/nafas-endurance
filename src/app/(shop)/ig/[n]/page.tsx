/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProductCard from "@/components/ProductCard";
import { getPostByNumber, getProducts } from "@/lib/data";

export const revalidate = 60;
type Props = { params: Promise<{ n: string }> };

async function load(params: Props["params"]) {
  const n = Number((await params).n);
  if (!Number.isInteger(n) || n < 1) return null;
  return getPostByNumber(n);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await load(params);
  if (!post) return {};
  return { title: post.title || "Shop this post", description: post.caption || undefined, openGraph: { images: [post.image] } };
}

export default async function ShopPost({ params }: Props) {
  const post = await load(params);
  if (!post) notFound();
  const all = await getProducts();
  const items = post.product_ids.map((id) => all.find((p) => p.id === id)).filter((p) => !!p);
  return (
    <div className="pt-8">
      <Link href="/ig" className="text-sm text-ink-3 hover:text-ink">← All posts</Link>
      <div className="mt-4 grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="md:sticky md:top-24 md:self-start">
          <img src={post.image} alt={post.title || "Instagram post"} className="aspect-square w-full rounded-2xl border border-line object-cover" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{post.title || "Shop this post"}</h1>
          {post.caption && <p className="mt-2 whitespace-pre-line text-ink-2">{post.caption}</p>}
          <p className="mt-4 text-sm font-semibold text-ink-3">{items.length} item{items.length === 1 ? "" : "s"} in this post</p>
          {items.length ? (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {items.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          ) : (
            <p className="mt-3 text-ink-2">These items aren&apos;t available right now. <Link href="/" className="underline">See everything in the shop</Link>.</p>
          )}
        </div>
      </div>
    </div>
  );
}
