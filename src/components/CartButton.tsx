"use client";
import Link from "next/link";
import { useCart } from "./CartProvider";
import { BagIcon } from "./Icons";

export default function CartButton() {
  const { count } = useCart();
  return (
    <Link href="/cart" className="relative inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold" aria-label={`Cart, ${count} items`}>
      <BagIcon />
      <span className="hidden sm:inline">Cart</span>
      {count > 0 && (
        <span className="absolute -right-2 -top-2 min-w-5 rounded-full bg-accent px-1.5 text-center text-xs font-bold leading-5 text-accent-ink">{count}</span>
      )}
    </Link>
  );
}
