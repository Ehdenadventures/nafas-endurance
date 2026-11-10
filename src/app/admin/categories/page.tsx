import { requireAdmin } from "@/lib/auth";
import { categoryLabel, categoryTree, getCategories, getProducts, isDemo } from "@/lib/data";
import type { Category } from "@/lib/types";
import AdminNav from "../AdminNav";
import { saveCategoryAction } from "../actions";
import DeleteButton from "./DeleteButton";
import LogoField from "./LogoField";

export const dynamic = "force-dynamic";

type Opt = { id: string; label: string };

function Row({ c, options, count = 0, subs = 0, parent, placeholder = "New category", logo = false, uploads = true }: { c?: Category; options: Opt[]; count?: number; subs?: number; parent?: string; placeholder?: string; logo?: boolean; uploads?: boolean }) {
  return (
    <form action={saveCategoryAction} className="grid items-end gap-2 rounded-xl border border-line bg-surface p-3 sm:grid-cols-[1.4fr_1.4fr_2fr_70px_auto_auto_auto]">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="field"><label>Name</label><input name="name" className="input" defaultValue={c?.name} required placeholder={placeholder} /></div>
      <div className="field"><label>Inside</label>
        <select name="parent_id" className="input" defaultValue={c?.parent_id ?? parent ?? ""}>
          <option value="">Main category (brand)</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>
      <div className="field"><label>Description</label><input name="description" className="input" defaultValue={c?.description} /></div>
      <div className="field"><label>Order</label><input name="sort" type="number" className="input" defaultValue={c?.sort ?? 0} /></div>
      <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name="active" defaultChecked={c?.active ?? true} className="h-4 w-4" /> Live</label>
      <label className="flex items-center gap-2 pb-3 text-sm" title="Show this category in the moving brand strip on the home page"><input type="checkbox" name="is_brand" defaultChecked={c?.is_brand ?? false} className="h-4 w-4" /> Brand</label>
      <div className="flex gap-2 pb-0.5">
        <button className="btn py-2 text-sm">{c ? "Save" : "Add"}</button>
        {c && <DeleteButton name={c.name} products={count} subs={subs} />}
      </div>
      {logo ? <LogoField initial={c?.logo} uploads={uploads} /> : c?.logo ? <input type="hidden" name="logo" value={c.logo} /> : null}
    </form>
  );
}

export default async function CategoriesAdmin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  await requireAdmin();
  const [cats, products] = await Promise.all([getCategories({ includeHidden: true }), getProducts({ includeHidden: true })]);
  const uploads = !isDemo();
  const count = (id: string) => products.filter((p) => p.category_id === id).length;
  const children = (id: string | null) => cats.filter((c) => c.parent_id === id);
  // Every category, shown with its full path, as a place another category can go inside.
  const allOptions: Opt[] = cats.map((c) => ({ id: c.id, label: categoryLabel(cats, c.id) })).sort((a, b) => a.label.localeCompare(b.label));
  // A category can't be moved inside itself or one of its own subcategories.
  const optionsFor = (c?: Category) => {
    if (!c) return allOptions;
    const own = categoryTree(cats, c.id);
    return allOptions.filter((o) => !own.has(o.id));
  };

  const Branch = ({ c, depth }: { c: Category; depth: number }) => (
    <div className="space-y-2">
      {depth > 0 && <p className="mb-1 text-xs text-ink-3">{count(c.id)} products</p>}
      <Row c={c} options={optionsFor(c)} count={count(c.id)} subs={children(c.id).length} logo={!!c.is_brand} uploads={uploads} />
      <div className="space-y-3 border-l-2 border-line pl-4">
        {children(c.id).map((s) => <Branch key={s.id} c={s} depth={depth + 1} />)}
        <details className="rounded-xl" open={depth === 0 && children(c.id).length === 0}>
          <summary className="cursor-pointer text-xs font-semibold text-accent">+ Add a subcategory inside {c.name}</summary>
          <div className="mt-2"><Row options={allOptions} parent={c.id} placeholder={`New subcategory in ${c.name}`} /></div>
        </details>
      </div>
    </div>
  );

  return (
    <>
      <AdminNav active="categories" />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <h1 className="text-2xl font-bold">Categories</h1>
        {error && <p role="alert" className="rounded-xl border border-bad bg-surface px-4 py-3 text-sm font-semibold text-bad">{error}</p>}
        <p className="text-sm text-ink-2">Main categories show in the top menu. Inside each one you can add as many subcategories as you like, and subcategories inside those. Tick <b>Brand</b> on a category (for example Ultimate Italia) and press Save to show it in the moving brand strip on the home page; you can then upload its logo. If no category is ticked, the strip shows the main categories.</p>
        <section>
          <h2 className="mb-2 font-semibold">Add a brand or category</h2>
          <Row options={allOptions} />
        </section>
        {children(null).map((t) => (
          <section key={t.id} className="space-y-2">
            <h2 className="font-semibold">{t.name}</h2>
            <Branch c={t} depth={0} />
          </section>
        ))}
      </main>
    </>
  );
}
