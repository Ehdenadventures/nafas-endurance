"use client";
import { useState } from "react";
import Link from "next/link";
import { optionLabel, type Package, type Variant } from "@/lib/types";
import { money } from "@/lib/site";
import { packStock, photoFor } from "@/lib/stock";
import { useCart } from "./CartProvider";
import { useColour } from "./ColourContext";

type Props = {
  productId: string; slug: string; name: string; price: number; image?: string; personalizable: boolean;
  /** Stock when the product has no colours. null = no limit. */
  stock: number | null;
  colours: Variant[];
  packages: Package[];
  /** "print" for 3D printed items: says Colour and Size instead of Flavour and Packaging. */
  kind?: string;
};

export default function AddToCart(p: Props) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [text, setText] = useState("");
  const [added, setAdded] = useState(false);
  const local = useState(p.colours.find((c) => c.stock !== 0)?.name ?? "");
  const shared = useColour();
  const [colour, setColour] = shared ? [shared.colour, shared.setColour] : local;

  const localPack = useState(p.packages[0]?.name ?? "");
  const [packName, setPackName] = shared ? [shared.pack, shared.setPack] : localPack;
  const pack = p.packages.find((x) => x.name === packName);
  const price = pack ? pack.price : p.price;

  const chosen = p.colours.find((c) => c.name === colour);
  const flavourKey = p.colours.length ? colour : "";
  // With packaging, each packaging has its own stock per flavour.
  const leftFor = (pk: Package | undefined, flav: string) =>
    p.packages.length ? (pk ? packStock(pk, flav) : 0) : p.colours.length ? stockOf(flav) : p.stock;
  // A flavour with no stock number set has no limit (null); an unknown flavour has none.
  function stockOf(flav: string) { const c = p.colours.find((x) => x.name === flav); return c ? c.stock : 0; }
  const flavourOut = (flav: string) => (p.packages.length ? p.packages.every((pk) => packStock(pk, flav) === 0) : p.colours.find((c) => c.name === flav)?.stock === 0);
  const left = p.colours.length && !chosen ? 0 : leftFor(pack, flavourKey);
  const max = Math.min(99, left ?? 99);
  const needsText = p.personalizable && !text.trim();
  const blocked = needsText || (p.colours.length > 0 && !chosen) || (p.packages.length > 0 && !pack) || max < 1;

  return (
    <div className="mt-6 space-y-4">
      {p.colours.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">
            {optionLabel(p.kind)}: <span className="font-normal text-ink-2">{colour || "choose one"}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {p.colours.map((c) => {
              const out = flavourOut(c.name);
              const on = c.name === colour;
              return (
                <button
                  key={c.name}
                  type="button"
                  disabled={out}
                  aria-pressed={on}
                  title={out ? `${c.name} (sold out)` : c.name}
                  onClick={() => {
                    setColour(c.name);
                    // Keep the packaging if it's in stock in this flavour, otherwise switch to one that is.
                    const pk = pack && leftFor(pack, c.name) !== 0 ? pack : p.packages.find((x) => packStock(x, c.name) !== 0);
                    if (pk && pk !== pack) setPackName(pk.name);
                    const l = leftFor(pk, c.name);
                    setQty((q) => Math.max(1, Math.min(q, l ?? 99)));
                    setAdded(false);
                  }}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-accent ring-2 ring-accent" : "border-line hover:border-ink-3"} ${out ? "cursor-not-allowed opacity-45 line-through" : ""}`}
                >
                  <span className="h-5 w-5 rounded-full border border-line" style={{ background: c.hex }} />
                  {c.name}
                </button>
              );
            })}
          </div>
          {!p.packages.length && chosen && chosen.stock !== null && chosen.stock > 0 && chosen.stock <= 5 && (
            <p className="mt-2 text-sm font-semibold text-bad">Only {chosen.stock} left in {chosen.name}</p>
          )}
        </fieldset>
      )}
      {p.packages.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{p.kind === "print" ? "Size" : "Packaging"}</legend>
          <div className="flex flex-wrap gap-2">
            {p.packages.map((x) => {
              const on = x.name === packName;
              const short = leftFor(x, flavourKey) === 0;
              return (
                <button
                  key={x.name}
                  type="button"
                  disabled={short}
                  aria-pressed={on}
                  onClick={() => { setPackName(x.name); setQty((q) => Math.max(1, Math.min(q, leftFor(x, flavourKey) ?? 99))); setAdded(false); }}
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition ${on ? "border-accent ring-2 ring-accent" : "border-line hover:border-ink-3"} ${short ? "cursor-not-allowed opacity-45" : ""}`}
                >
                  <span className="block font-semibold">{x.name}</span>
                  <span className="block text-ink-2">{short ? "Sold out" : <>{money(x.price)}{x.units > 1 && <span className="text-xs text-ink-3"> · {money(x.price / x.units)} each</span>}</>}</span>
                </button>
              );
            })}
          </div>
          {pack && left !== null && left > 0 && left <= 5 && (
            <p className="mt-2 text-sm font-semibold text-bad">Only {left} left{colour ? ` in ${colour}` : ""} ({pack.name})</p>
          )}
        </fieldset>
      )}
      {p.packages.length > 0 && <p className="text-2xl font-bold text-accent" aria-live="polite">{money(price * qty)}</p>}
      {p.personalizable && (
        <div className="field">
          <label htmlFor="pers">{p.kind === "print" ? "Name to print" : "Name or note"}</label>
          <input id="pers" className="input" maxLength={30} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Chafic" />
          <span className="text-xs text-ink-3">Up to 30 characters.{p.kind === "print" ? " We print it exactly as written." : ""}</span>
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
            add({ productId: p.productId, slug: p.slug, name: p.name, price, image: photoFor({ variants: p.colours, packages: p.packages }, colour, packName) ?? p.image, personalization: text, colour: chosen?.name, package: pack?.name, kind: p.kind }, qty);
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
