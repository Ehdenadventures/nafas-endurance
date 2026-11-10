import Link from "next/link";
import { logoutAction } from "./actions";
import { isDemo } from "@/lib/data";

export default function AdminNav({ active }: { active: "orders" | "products" | "categories" | "posts" | "look" }) {
  const tab = (href: string, key: string, label: string) => (
    <Link href={href} className={`rounded-lg px-3 py-2 text-sm font-semibold ${active === key ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-surface-2"}`}>{label}</Link>
  );
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
          <Link href="/admin" className="mr-3 font-extrabold">Shop admin</Link>
          {tab("/admin", "orders", "Orders")}
          {tab("/admin/products", "products", "Products")}
          {tab("/admin/categories", "categories", "Categories")}
          {tab("/admin/posts", "posts", "Instagram posts")}
          {tab("/admin/look", "look", "Banner")}
          <div className="ml-auto flex items-center gap-2">
            <Link href="/" className="text-sm text-ink-2 hover:text-ink" target="_blank">View shop ↗</Link>
            <form action={logoutAction}><button className="btn py-1.5 text-sm">Log out</button></form>
          </div>
        </div>
      </header>
      {isDemo() && (
        <p className="bg-accent-soft px-4 py-2 text-center text-sm">
          Preview mode: Supabase isn&apos;t connected, so changes and orders are kept in memory and lost on restart.
        </p>
      )}
    </>
  );
}
