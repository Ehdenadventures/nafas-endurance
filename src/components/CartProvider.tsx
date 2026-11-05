"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartLine = {
  key: string; // product id + personalization
  productId: string;
  slug: string;
  name: string;
  price: number;
  image?: string;
  qty: number;
  personalization: string;
  colour?: string;
};

type Cart = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  ready: boolean;
  add: (l: Omit<CartLine, "key" | "qty">, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const Ctx = createContext<Cart | null>(null);
const STORE = "3dpl_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) setLines(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORE, JSON.stringify(lines));
    } catch {}
  }, [lines, ready]);

  const add = useCallback<Cart["add"]>((l, qty = 1) => {
    const key = `${l.productId}::${l.colour ?? ""}::${l.personalization.trim()}`;
    setLines((cur) => {
      const found = cur.find((x) => x.key === key);
      if (found) return cur.map((x) => (x.key === key ? { ...x, qty: Math.min(99, x.qty + qty) } : x));
      return [...cur, { ...l, personalization: l.personalization.trim(), key, qty }];
    });
  }, []);
  const setQty = useCallback((key: string, qty: number) => {
    setLines((cur) => cur.map((x) => (x.key === key ? { ...x, qty: Math.max(1, Math.min(99, qty)) } : x)));
  }, []);
  const remove = useCallback((key: string) => setLines((cur) => cur.filter((x) => x.key !== key)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({
      lines,
      ready,
      count: lines.reduce((a, l) => a + l.qty, 0),
      subtotal: lines.reduce((a, l) => a + l.qty * l.price, 0),
      add,
      setQty,
      remove,
      clear,
    }),
    [lines, ready, add, setQty, remove, clear],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
