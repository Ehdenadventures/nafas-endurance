/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Metadata } from "next";
import { InstagramIcon } from "@/components/Icons";
import { getPosts } from "@/lib/data";
import { site } from "@/lib/site";

export const revalidate = 60;
export const metadata: Metadata = { title: "Shop our Instagram", description: `Tap a post to shop the items in it.` };

export default async function InstagramShop() {
  const posts = await getPosts();
  return (
    <div className="mx-auto max-w-3xl pt-8">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">Shop our Instagram</h1>
        <p className="mt-2 text-ink-2">Tap a post to see and order the items in it.</p>
        {site.instagram && (
          <a href={`https://instagram.com/${site.instagram}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
            <InstagramIcon className="h-4 w-4" /> @{site.instagram}
          </a>
        )}
      </div>
      {posts.length ? (
        <div className="mt-6 grid grid-cols-3 gap-1 sm:gap-2">
          {posts.map((p) => (
            <Link key={p.id} href={`/ig/${p.number}`} className="group relative aspect-square overflow-hidden bg-surface-2 sm:rounded-lg">
              <img src={p.image} alt={p.title || "Instagram post"} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
              <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
                {p.product_ids.length} item{p.product_ids.length === 1 ? "" : "s"}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-10 text-center text-ink-2">New posts are coming soon.</p>
      )}
      <div className="mt-8 text-center">
        <Link href="/" className="btn">Browse all products</Link>
      </div>
    </div>
  );
}
