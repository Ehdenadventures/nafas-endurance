/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getPosts, getProducts } from "@/lib/data";
import { site } from "@/lib/site";
import AdminNav from "../AdminNav";
import CopyLink from "./CopyLink";

export const dynamic = "force-dynamic";

export default async function PostsAdmin() {
  await requireAdmin();
  const [posts, products] = await Promise.all([getPosts({ includeHidden: true }), getProducts({ includeHidden: true })]);
  const name = (id: string) => products.find((p) => p.id === id)?.name ?? "(deleted product)";
  const host = site.url.replace(/^https?:\/\//, "");
  return (
    <>
      <AdminNav active="posts" />
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Instagram posts <span className="text-base font-normal text-ink-3">({posts.length})</span></h1>
          <Link href="/admin/posts/new" className="btn btn-primary">Add post</Link>
        </div>
        <div className="rounded-2xl bg-accent-soft p-4 text-sm">
          <p className="font-semibold">Your Instagram bio link: <span className="font-mono">{host}/ig</span> <CopyLink url={`${site.url}/ig`} /></p>
          <p className="mt-1 text-ink-2">
            Customers tap the link in your bio, see your posts as a grid, and tap a post to buy the items in it.
            Add each Instagram post here with the same picture and pick the products shown in it.
          </p>
        </div>
        {posts.length === 0 && <p className="text-ink-2">No posts yet. Press <b>Add post</b> to add your first one.</p>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-2xl border border-line bg-surface">
              <Link href={`/admin/posts/${p.id}`} className="block aspect-square bg-surface-2">
                {p.image && <img src={p.image} alt="" className="h-full w-full object-cover" />}
              </Link>
              <div className="space-y-1 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/admin/posts/${p.id}`} className="font-semibold hover:underline">{p.title || `Post ${p.number}`}</Link>
                  {!p.active && <span className="text-ink-3">Hidden</span>}
                </div>
                <p className="text-ink-2">{p.product_ids.map(name).join(", ")}</p>
                <p className="text-ink-3"><span className="font-mono">{host}/ig/{p.number}</span> <CopyLink url={`${site.url}/ig/${p.number}`} /></p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
