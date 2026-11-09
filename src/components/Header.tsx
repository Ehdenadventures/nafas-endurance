import Link from "next/link";
import { getCategories } from "@/lib/data";
import type { Category } from "@/lib/types";
import { site } from "@/lib/site";
import CartButton from "./CartButton";
import Logo from "./Logo";

/** A dropdown of subcategories; a subcategory with its own subcategories opens another one to the left
 *  (the menu sits on the right of the header, so this keeps every list on screen). */
function SubMenu({ parent, all, level }: { parent: Category; all: Category[]; level: number }) {
  const kids = all.filter((c) => c.parent_id === parent.id);
  if (!kids.length || level > 5) return null;
  return (
    <div className={`menu-drop absolute z-40 ${level === 1 ? "right-0 top-full pt-2" : "right-full top-0 -mt-2 pr-1"}`}>
      <ul className="min-w-52 rounded-xl border border-line bg-surface p-2 shadow-lg">
        {kids.map((k) => {
          const more = all.some((c) => c.parent_id === k.id);
          return (
            <li key={k.id} className="menu-item relative">
              <Link href={`/c/${k.slug}`} className="flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink">
                <span aria-hidden className={`w-2 text-ink-3 ${more ? "" : "invisible"}`}>‹</span>
                {k.name}
              </Link>
              <SubMenu parent={k} all={all} level={level + 1} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default async function Header() {
  const all = await getCategories();
  const top = all.filter((c) => !c.parent_id);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" aria-label={`${site.name} home`}>
          <Logo height={40} />
        </Link>
        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Brands">
          {top.map((c) => {
            const more = all.some((x) => x.parent_id === c.id);
            return (
              <div key={c.id} className="menu-item relative">
                <Link href={`/c/${c.slug}`} aria-haspopup={more || undefined} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
                  {c.name}
                  {more && <span aria-hidden className="text-xs text-ink-3">▾</span>}
                </Link>
                <SubMenu parent={c} all={all} level={1} />
              </div>
            );
          })}
          <Link href="/ig" className="rounded-lg px-3 py-2 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
            Instagram
          </Link>
        </nav>
        <div className="ml-auto md:ml-2">
          <CartButton />
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden" aria-label="Brands">
        {top.map((c) => (
          <Link key={c.id} href={`/c/${c.slug}`} className="shrink-0 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium">
            {c.name}
          </Link>
        ))}
        <Link href="/ig" className="shrink-0 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium">
          Instagram
        </Link>
      </nav>
    </header>
  );
}
