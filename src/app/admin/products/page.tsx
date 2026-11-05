import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getCategories, getProducts } from "@/lib/data";
import { money } from "@/lib/site";
import AdminNav from "../AdminNav";

export const dynamic = "force-dynamic";

export default async function ProductsAdmin() {
  await requireAdmin();
  const [products, cats] = await Promise.all([getProducts({ includeHidden: true }), getCategories({ includeHidden: true })]);
  const label = (id: string | null) => {
    const c = cats.find((x) => x.id === id);
    if (!c) return "No category";
    const p = cats.find((x) => x.id === c.parent_id);
    return p ? `${p.name} › ${c.name}` : c.name;
  };
  const sorted = [...products].sort((a, b) => label(a.category_id).localeCompare(label(b.category_id)) || a.sort - b.sort);
  return (
    <>
      <AdminNav active="products" />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Products <span className="text-base font-normal text-ink-3">({products.length})</span></h1>
          <Link href="/admin/products/new" className="btn btn-primary">Add product</Link>
        </div>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-ink-3">
              <tr><th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3 text-right">Price</th><th className="p-3 text-right">Stock</th><th className="p-3">Media</th><th className="p-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sorted.map((p) => (
                <tr key={p.id} className="hover:bg-surface-2">
                  <td className="p-3 font-semibold"><Link href={`/admin/products/${p.id}`} className="hover:underline">{p.name}</Link></td>
                  <td className="p-3 text-ink-2">{label(p.category_id)}</td>
                  <td className="p-3 text-right">{money(p.price)}</td>
                  <td className="p-3 text-right">
                    {p.variants.length ? (
                      <span title={p.variants.map((v) => `${v.name}: ${v.stock ?? "no limit"}`).join("\n")}>
                        {p.variants.map((v) => (
                          <span key={v.name} className={`ml-2 inline-flex items-center gap-1 ${v.stock === 0 ? "text-bad" : ""}`}>
                            <span className="h-2.5 w-2.5 rounded-full border border-line" style={{ background: v.hex }} />{v.stock ?? "∞"}
                          </span>
                        ))}
                      </span>
                    ) : p.stock === null ? <span className="text-ink-3">No limit</span>
                      : p.stock === 0 ? <span className="font-semibold text-bad">Sold out</span>
                      : <span className={p.stock <= 3 ? "font-semibold text-[#c44a16] dark:text-pink" : ""}>{p.stock}</span>}
                  </td>
                  <td className="p-3 text-ink-2">{p.media.length || <span className="text-bad">none</span>}</td>
                  <td className="p-3">{p.active ? "Live" : <span className="text-ink-3">Hidden</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
