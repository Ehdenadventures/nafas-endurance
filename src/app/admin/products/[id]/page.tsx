import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { categoryLabel, getCategories, getProductById, isDemo } from "@/lib/data";
import AdminNav from "../../AdminNav";
import ProductForm from "./ProductForm";

export const dynamic = "force-dynamic";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const product = id === "new" ? null : await getProductById(id);
  if (id !== "new" && !product) notFound();
  const cats = await getCategories({ includeHidden: true });
  const options = cats.map((c) => ({ id: c.id, label: categoryLabel(cats, c.id) })).sort((a, b) => a.label.localeCompare(b.label));
  return (
    <>
      <AdminNav active="products" />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <ProductForm product={product} categories={options} uploads={!isDemo()} />
      </main>
    </>
  );
}
