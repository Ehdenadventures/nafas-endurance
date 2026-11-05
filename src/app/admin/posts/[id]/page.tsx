import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getPostById, getProducts, isDemo } from "@/lib/data";
import AdminNav from "../../AdminNav";
import PostForm from "./PostForm";

export const dynamic = "force-dynamic";

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const post = id === "new" ? null : await getPostById(id);
  if (id !== "new" && !post) notFound();
  const products = (await getProducts({ includeHidden: true })).map((p) => ({
    id: p.id, name: p.name, image: p.media.find((m) => m.type === "image")?.url, active: p.active,
  }));
  return (
    <>
      <AdminNav active="posts" />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <PostForm post={post} products={products} uploads={!isDemo()} />
      </main>
    </>
  );
}
