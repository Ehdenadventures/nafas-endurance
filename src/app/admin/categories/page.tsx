import { requireAdmin } from "@/lib/auth";
import { getCategories, getProducts } from "@/lib/data";
import type { Category } from "@/lib/types";
import AdminNav from "../AdminNav";
import { saveCategoryAction } from "../actions";
import DeleteButton from "./DeleteButton";

export const dynamic = "force-dynamic";

function Row({ c, tops, count = 0, subs = 0, parent, placeholder = "New category" }: { c?: Category; tops: Category[]; count?: number; subs?: number; parent?: string; placeholder?: string }) {
  return (
    <form action={saveCategoryAction} className="grid items-end gap-2 rounded-xl border border-line bg-surface p-3 sm:grid-cols-[1.4fr_1.2fr_2fr_70px_auto_auto]">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="field"><label>Name</label><input name="name" className="input" defaultValue={c?.name} required placeholder={placeholder} /></div>
      <div className="field"><label>Inside</label>
        <select name="parent_id" className="input" defaultValue={c?.parent_id ?? parent ?? ""}>
          <option value="">Main category</option>
          {tops.filter((t) => t.id !== c?.id).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div className="field"><label>Description</label><input name="description" className="input" defaultValue={c?.description} /></div>
      <div className="field"><label>Order</label><input name="sort" type="number" className="input" defaultValue={c?.sort ?? 0} /></div>
      <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name="active" defaultChecked={c?.active ?? true} className="h-4 w-4" /> Live</label>
      <div className="flex gap-2 pb-0.5">
        <button className="btn py-2 text-sm">{c ? "Save" : "Add"}</button>
        {c && (
          <DeleteButton name={c.name} products={count} subs={subs} />
        )}
      </div>
    </form>
  );
}

export default async function CategoriesAdmin() {
  await requireAdmin();
  const [cats, products] = await Promise.all([getCategories({ includeHidden: true }), getProducts({ includeHidden: true })]);
  const tops = cats.filter((c) => !c.parent_id);
  const count = (id: string) => products.filter((p) => p.category_id === id).length;
  return (
    <>
      <AdminNav active="categories" />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <h1 className="text-2xl font-bold">Categories</h1>
        <section>
          <h2 className="mb-2 font-semibold">Add a category</h2>
          <Row tops={tops} />
        </section>
        {tops.map((t) => (
          <section key={t.id} className="space-y-2">
            <h2 className="font-semibold">{t.name}</h2>
            <Row c={t} tops={tops} count={count(t.id)} subs={cats.filter((c) => c.parent_id === t.id).length} />
            <div className="space-y-2 border-l-2 border-line pl-4">
              {cats.filter((c) => c.parent_id === t.id).map((c) => (
                <div key={c.id}>
                  <p className="mb-1 text-xs text-ink-3">{count(c.id)} products</p>
                  <Row c={c} tops={tops} count={count(c.id)} />
                </div>
              ))}
              <div>
                <p className="mb-1 text-xs font-semibold text-ink-3">Add a subcategory to {t.name}</p>
                <Row tops={tops} parent={t.id} placeholder={`New subcategory in ${t.name}`} />
              </div>
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
