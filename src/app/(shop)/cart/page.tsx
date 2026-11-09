"use client";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { CubeIcon } from "@/components/Icons";

const money = (n: number) => `$${(Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, "")}`;

export default function CartPage() {
  const { lines, subtotal, setQty, remove, ready } = useCart();
  if (!ready) return <div className="py-20" />;
  if (!lines.length)
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <Link href="/" className="btn btn-primary mt-6">Browse the shop</Link>
      </div>
    );
  return (
    <div className="mx-auto max-w-3xl pt-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Your cart</h1>
      <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-surface">
        {lines.map((l) => (
          <li key={l.key} className="flex gap-3 p-3 sm:gap-4 sm:p-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-2">
              {l.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="layers flex h-full w-full items-center justify-center text-ink-3"><CubeIcon className="h-7 w-7" /></div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/p/${l.slug}`} className="font-semibold hover:underline">{l.name}</Link>
              {l.colour && <p className="text-sm text-ink-2">Flavour: {l.colour}</p>}
              {l.package && <p className="text-sm text-ink-2">Packaging: {l.package}</p>}
              {l.personalization && <p className="text-sm text-ink-2">Name: {l.personalization}</p>}
              <p className="text-sm text-ink-3">{money(l.price)} each</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex items-center rounded-lg border border-line">
                  <button className="px-2.5 py-1" onClick={() => setQty(l.key, l.qty - 1)} aria-label="Fewer">−</button>
                  <span className="w-7 text-center text-sm font-semibold">{l.qty}</span>
                  <button className="px-2.5 py-1" onClick={() => setQty(l.key, l.qty + 1)} aria-label="More">+</button>
                </div>
                <button className="text-sm text-ink-3 hover:text-bad" onClick={() => remove(l.key)}>Remove</button>
              </div>
            </div>
            <p className="font-bold">{money(l.qty * l.price)}</p>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-col items-end gap-3">
        <p className="text-lg">Subtotal <b>{money(subtotal)}</b></p>
        <p className="text-sm text-ink-3">Delivery is added at checkout. You pay cash when your order arrives.</p>
        <Link href="/checkout" className="btn btn-primary w-full sm:w-auto">Checkout</Link>
      </div>
    </div>
  );
}
