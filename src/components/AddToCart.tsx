"use client";
import { useState } from "react";
import Link from "next/link";
import type { Variant } from "@/lib/types";
import { useCart } from "./CartProvider";
import { useColour } from "./ColourContext";

type Props = {
  productId: string; slug: string; name: string; price: number; image?: string; personalizable: boolean;
  /** Stock when the product has no colours. null = no limit. */
  stock: number | null;
  colours: Variant[];
};

export default function AddToCart(p: Props) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [text, setText] = useState("");
  const [added, setAdded] = useState(false);
  const local = useState(p.colours.find((c) => c.stock !== 0)?.name ?? "");
  const shared = useColour();
  const [colour, setColour] = shared ? [shared.colour, shared.setColour] : local;

  const chosen = p.colours.find((c) => c.name === colour);
  const left = p.colours.length ? (chosen ? chosen.stock : 0) : p.stock;
  const max = Math.min(99, left ?? 99);
  const needsText = p.personalizable && !text.trim();
  const blocked = needsText || (p.colours.length > 0 && !chosen) || left === 0;

  return (
    <div className="mt-6 space-y-4">
      {p.colours.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">
            Flavour: <span className="font-normal text-ink-2">{colour || "choose one"}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {p.colours.map((c) => {
              const out = c.stock === 0;
              const on = c.name === colour;
              return (
                <button
                  key={c.name}
                  type="button"
                  disabled={out}
                  aria-pressed={on}
                  title={out ? `${c.name} (sold out)` : c.name}
                  onClick={() => { setColour(c.name); setQty((q) => Math.min(q, Math.min(99, c.stock ?? 99))); setAdded(false); }}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-accent ring-2 ring-accent" : "border-line hover:border-ink-3"} ${out ? "cursor-not-allowed opacity-45 line-through" : ""}`}
                >
                  <span className="h-5 w-5 rounded-full border border-line" style={{ background: c.hex }} />
                  {c.name}
                </button>
              );
            })}
          </div>
          {chosen && chosen.stock !== null && chosen.stock > 0 && chosen.stock <= 5 && (
            <p className="mt-2 text-sm font-semibold text-bad">Only {chosen.stock} left in {chosen.name}</p>
          )}
        </fieldset>
      )}
      {p.personalizable && (
        <div className="field">
          <label htmlFor="pers">Name or note</label>
          <input id="pers" className="input" maxLength={30} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Chafic" />
          <span className="text-xs text-ink-3">Up to 30 characters.</span>
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-xl border border-line bg-surface">
          <button className="px-3 py-2 text-lg" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Fewer">−</button>
          <span className="w-8 text-center font-semibold" aria-live="polite">{qty}</span>
          <button className="px-3 py-2 text-lg" onClick={() => setQty((q) => Math.min(max, q + 1))} aria-label="More">+</button>
        </div>
        <button
          className="btn btn-primary flex-1"
          disabled={blocked}
          onClick={() => {
            add({ productId: p.productId, slug: p.slug, name: p.name, price: p.price, image: chosen?.image ?? p.image, personalization: text, colour: chosen?.name }, qty);
            setAdded(true);
          }}
        >
          Add to cart
        </button>
      </div>
      {added && (
        <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm">
          Added to your cart. <Link href="/cart" className="font-semibold underline">Go to checkout</Link>
        </p>
      )}
    </div>
  );
}
