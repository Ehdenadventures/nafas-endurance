"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { placeOrder } from "./actions";

const money = (n: number) => `$${(Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, "")}`;

export default function CheckoutForm({ deliveryFee }: { deliveryFee: number }) {
  const { lines, subtotal, clear, ready } = useCart();
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (!ready) return <div className="py-20" />;
  if (!lines.length)
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <Link href="/" className="btn btn-primary mt-6">Browse the shop</Link>
      </div>
    );

  function submit(fd: FormData) {
    setError("");
    start(async () => {
      const res = await placeOrder({
        name: String(fd.get("name")),
        phone: String(fd.get("phone")),
        city: String(fd.get("city")),
        address: String(fd.get("address")),
        notes: String(fd.get("notes") ?? ""),
        items: lines.map((l) => ({ productId: l.productId, qty: l.qty, personalization: l.personalization, colour: l.colour })),
      });
      if (!res.ok) return setError(res.error);
      clear();
      router.push(`/order/${res.orderId}`);
    });
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-8 pt-8 md:grid-cols-[1fr_320px]">
      <form action={submit} className="space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight">Checkout</h1>
        <p className="text-ink-2">Pay cash when your order arrives. We&apos;ll call or WhatsApp you to confirm.</p>
        <div className="field"><label htmlFor="name">Full name</label><input id="name" name="name" className="input" required autoComplete="name" /></div>
        <div className="field"><label htmlFor="phone">Phone (WhatsApp)</label><input id="phone" name="phone" className="input" required type="tel" autoComplete="tel" placeholder="+961 70 123 456" /></div>
        <div className="field"><label htmlFor="city">Area / town</label><input id="city" name="city" className="input" required placeholder="e.g. Zgharta, Achrafieh, Jounieh" /></div>
        <div className="field"><label htmlFor="address">Address and directions</label><textarea id="address" name="address" className="input" required rows={3} placeholder="Street, building, floor, nearby landmark" /></div>
        <div className="field"><label htmlFor="notes">Notes (optional)</label><textarea id="notes" name="notes" className="input" rows={2} placeholder="Flavour preference, best time to call..." /></div>
        {error && <p className="rounded-xl bg-bad/10 px-4 py-3 text-sm text-bad" role="alert">{error}</p>}
        <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Placing order..." : `Place order · ${money(subtotal + deliveryFee)}`}</button>
      </form>
      <aside className="h-fit rounded-2xl border border-line bg-surface p-4">
        <h2 className="font-bold">Order summary</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {lines.map((l) => (
            <li key={l.key} className="flex justify-between gap-2">
              <span>{l.qty} × {l.name}{l.colour && <span className="block text-xs text-ink-3">Flavour: {l.colour}</span>}{l.personalization && <span className="block text-xs text-ink-3">Name: {l.personalization}</span>}</span>
              <span className="font-semibold">{money(l.qty * l.price)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
          <p className="flex justify-between"><span>Subtotal</span><span>{money(subtotal)}</span></p>
          <p className="flex justify-between"><span>Delivery</span><span>{money(deliveryFee)}</span></p>
          <p className="flex justify-between text-base font-bold"><span>Total (cash on delivery)</span><span>{money(subtotal + deliveryFee)}</span></p>
        </div>
      </aside>
    </div>
  );
}
