import "server-only";
import seed from "./seed.json";
import { db } from "./supabase";
import { cleanVariants } from "./stock";
import type { Category, Order, OrderItem, OrderStatus, Post, Product } from "./types";

/*
 * All reads and writes go through this file.
 * With Supabase configured it uses the database; without it (local preview) it runs
 * on an in-memory copy of src/lib/seed.json so the site still works.
 */

type Demo = { categories: Category[]; products: Product[]; orders: Order[]; posts: Post[] };
const g = globalThis as unknown as { __demo?: Demo };
function demo(): Demo {
  if (!g.__demo) {
    const categories: Category[] = seed.categories.map((c) => ({
      id: c.slug,
      slug: c.slug,
      name: c.name,
      description: c.description,
      parent_id: c.parent,
      sort: c.sort,
      active: c.active,
    }));
    const products: Product[] = seed.products.map((p) => ({
      id: p.slug,
      slug: p.slug,
      name: p.name,
      description: p.description,
      price: p.price,
      category_id: p.category,
      active: p.active,
      personalizable: p.personalizable,
      sort: p.sort,
      stock: null,
      variants: [],
      media: [],
    }));
    g.__demo = { categories, products, orders: [], posts: [] };
  }
  return g.__demo;
}

export const isDemo = () => db() === null;

const num = <T extends { price?: unknown; stock?: unknown; variants?: unknown }>(r: T) => ({
  ...r,
  variants: cleanVariants(r.variants),
  price: Number(r.price),
  stock: r.stock == null ? null : Number(r.stock),
});
const bySort = <T extends { sort: number; name: string }>(a: T, b: T) => a.sort - b.sort || a.name.localeCompare(b.name);

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

/* ---------------- categories ---------------- */

export async function getCategories(opts: { includeHidden?: boolean } = {}): Promise<Category[]> {
  const s = db();
  let rows: Category[];
  if (!s) rows = [...demo().categories];
  else {
    const { data, error } = await s.from("categories").select("*");
    fail(error);
    rows = (data ?? []) as Category[];
  }
  return rows.filter((c) => opts.includeHidden || c.active).sort(bySort);
}

export async function getCategoryBySlug(slug: string) {
  return (await getCategories()).find((c) => c.slug === slug) ?? null;
}

export async function saveCategory(c: Omit<Category, "id"> & { id?: string }) {
  const s = db();
  if (!s) {
    const d = demo();
    const i = d.categories.findIndex((x) => x.id === c.id);
    if (i >= 0) d.categories[i] = { ...d.categories[i], ...c, id: d.categories[i].id };
    else d.categories.push({ ...c, id: c.slug });
    return;
  }
  const { id, ...rest } = c;
  const { error } = id ? await s.from("categories").update(rest).eq("id", id) : await s.from("categories").insert(rest);
  fail(error);
}

export async function deleteCategory(id: string) {
  const s = db();
  if (!s) {
    const d = demo();
    d.categories = d.categories.filter((c) => c.id !== id);
    d.categories.forEach((c) => c.parent_id === id && (c.parent_id = null));
    d.products.forEach((p) => p.category_id === id && (p.category_id = null));
    return;
  }
  const { error } = await s.from("categories").delete().eq("id", id);
  fail(error);
}

/* ---------------- products ---------------- */

export async function getProducts(opts: { includeHidden?: boolean } = {}): Promise<Product[]> {
  const s = db();
  let rows: Product[];
  if (!s) rows = demo().products.map((p) => ({ ...p }));
  else {
    const { data, error } = await s.from("products").select("*");
    fail(error);
    rows = (data ?? []).map(num) as Product[];
  }
  if (!opts.includeHidden) {
    const visible = new Set((await getCategories()).map((c) => c.id));
    rows = rows.filter((p) => p.active && (!p.category_id || visible.has(p.category_id)));
  }
  return rows.sort(bySort);
}

export async function getProductBySlug(slug: string, opts: { includeHidden?: boolean } = {}) {
  return (await getProducts(opts)).find((p) => p.slug === slug) ?? null;
}

export async function getProductById(id: string) {
  return (await getProducts({ includeHidden: true })).find((p) => p.id === id) ?? null;
}

export async function saveProduct(p: Omit<Product, "id"> & { id?: string }) {
  const s = db();
  if (!s) {
    const d = demo();
    const i = d.products.findIndex((x) => x.id === p.id);
    if (i >= 0) d.products[i] = { ...d.products[i], ...p, id: d.products[i].id };
    else d.products.push({ ...p, id: p.slug });
    return;
  }
  const { id, ...rest } = p;
  const { error } = id ? await s.from("products").update(rest).eq("id", id) : await s.from("products").insert(rest);
  fail(error);
}

export async function deleteProduct(id: string) {
  const s = db();
  if (!s) {
    demo().products = demo().products.filter((p) => p.id !== id);
    return;
  }
  const { error } = await s.from("products").delete().eq("id", id);
  fail(error);
}

/** Every category id at or below `rootId` (a main category includes its subcategories). */
export function categoryTree(categories: Category[], rootId: string): Set<string> {
  const ids = new Set([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of categories)
      if (c.parent_id && ids.has(c.parent_id) && !ids.has(c.id)) {
        ids.add(c.id);
        grew = true;
      }
  }
  return ids;
}

/* ---------------- stock ---------------- */

export class OutOfStockError extends Error {
  constructor(public productName: string, public left: number) {
    super(`Only ${left} left of "${productName}"`);
  }
}

type StockLine = Pick<OrderItem, "product_id" | "name" | "qty" | "colour">;
// If the stock SQL (supabase/migrations/002_stock.sql) hasn't been run yet, skip stock instead of blocking orders.
const missingFn = (e: { code?: string; message: string }) => e.code === "PGRST202" || /could not find the function/i.test(e.message);
const stockPayload = (items: StockLine[]) => items.map(({ product_id, name, qty, colour }) => ({ product_id, name, qty, colour: colour ?? "" }));

/** Preview mode: where each order line's stock lives (the product, or one of its colours). */
function demoSlots(items: StockLine[]) {
  const need = new Map<string, StockLine>();
  for (const i of items) {
    const k = `${i.product_id}::${i.colour ?? ""}`;
    const cur = need.get(k);
    need.set(k, cur ? { ...cur, qty: cur.qty + i.qty } : { ...i });
  }
  const out: { label: string; qty: number; get: () => number | null; add: (n: number) => void }[] = [];
  for (const i of need.values()) {
    const p = demo().products.find((x) => x.id === i.product_id);
    if (!p) continue;
    const v = i.colour ? p.variants.find((x) => x.name === i.colour) : undefined;
    if (v) out.push({ label: `${p.name} (${v.name})`, qty: i.qty, get: () => v.stock, add: (n) => { if (v.stock !== null) v.stock += n; } });
    else out.push({ label: p.name, qty: i.qty, get: () => p.stock, add: (n) => { if (p.stock !== null) p.stock += n; } });
  }
  return out;
}

/** Takes stock for a whole order at once. Throws OutOfStockError (and changes nothing) if anything is short. */
export async function takeStock(items: StockLine[]) {
  const s = db();
  if (!s) {
    const slots = demoSlots(items);
    for (const x of slots) {
      const left = x.get();
      if (left !== null && left < x.qty) throw new OutOfStockError(x.label, left);
    }
    for (const x of slots) x.add(-x.qty);
    return;
  }
  const { error } = await s.rpc("take_stock", { p_items: stockPayload(items) });
  if (error && !missingFn(error)) {
    const m = /OUT_OF_STOCK\|(.*)\|(\d+)/.exec(error.message);
    if (m) throw new OutOfStockError(m[1], Number(m[2]));
    throw new Error(error.message);
  }
}

/** Puts stock back (cancelled order, or an order that failed to save). */
export async function returnStock(items: StockLine[]) {
  const s = db();
  if (!s) {
    for (const x of demoSlots(items)) x.add(x.qty);
    return;
  }
  const { error } = await s.rpc("return_stock", { p_items: stockPayload(items) });
  if (error && !missingFn(error)) fail(error);
}

/* ---------------- orders ---------------- */

export type NewOrder = Pick<Order, "customer_name" | "phone" | "city" | "address" | "notes"> & {
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
};

export async function createOrder(o: NewOrder): Promise<Order> {
  const s = db();
  if (!s) {
    const d = demo();
    const order: Order = {
      ...o,
      id: crypto.randomUUID(),
      number: d.orders.length + 1,
      currency: "USD",
      payment_method: "cash_on_delivery",
      status: "new",
      delivery_status: "not_sent",
      delivery_ref: null,
      delivery_error: null,
      created_at: new Date().toISOString(),
    };
    d.orders.unshift(order);
    return order;
  }
  const { data, error } = await s.from("orders").insert(o).select("*").single();
  fail(error);
  return normalizeOrder(data);
}

const normalizeOrder = (r: Record<string, unknown>) =>
  ({
    ...r,
    number: Number(r.number),
    subtotal: Number(r.subtotal),
    delivery_fee: Number(r.delivery_fee),
    total: Number(r.total),
  }) as Order;

export async function getOrders(): Promise<Order[]> {
  const s = db();
  if (!s) return [...demo().orders];
  const { data, error } = await s.from("orders").select("*").order("created_at", { ascending: false }).limit(500);
  fail(error);
  return (data ?? []).map(normalizeOrder);
}

export async function getOrder(id: string): Promise<Order | null> {
  const s = db();
  if (!s) return demo().orders.find((o) => o.id === id) ?? null;
  const { data, error } = await s.from("orders").select("*").eq("id", id).maybeSingle();
  fail(error);
  return data ? normalizeOrder(data) : null;
}

export async function updateOrder(
  id: string,
  patch: Partial<Pick<Order, "status" | "delivery_status" | "delivery_ref" | "delivery_error">>,
) {
  const s = db();
  if (!s) {
    const o = demo().orders.find((x) => x.id === id);
    if (o) Object.assign(o, patch);
    return;
  }
  const { error } = await s.from("orders").update(patch).eq("id", id);
  fail(error);
}

/* ---------------- Instagram posts ---------------- */

const normalizePost = (r: Record<string, unknown>) =>
  ({
    ...r,
    number: Number(r.number),
    product_ids: Array.isArray(r.product_ids) ? (r.product_ids as unknown[]).map(String) : [],
  }) as Post;

export async function getPosts(opts: { includeHidden?: boolean } = {}): Promise<Post[]> {
  const s = db();
  let rows: Post[];
  if (!s) rows = demo().posts.map((p) => ({ ...p }));
  else {
    const { data, error } = await s.from("posts").select("*").order("created_at", { ascending: false }).limit(300);
    // Before the posts SQL is run the table doesn't exist yet; show no posts instead of an error.
    if (error && /posts/.test(error.message) && /(does not exist|schema cache)/i.test(error.message)) return [];
    fail(error);
    rows = (data ?? []).map(normalizePost);
  }
  rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return opts.includeHidden ? rows : rows.filter((p) => p.active);
}

export async function getPostByNumber(n: number, opts: { includeHidden?: boolean } = {}) {
  return (await getPosts(opts)).find((p) => p.number === n) ?? null;
}

export async function getPostById(id: string) {
  return (await getPosts({ includeHidden: true })).find((p) => p.id === id) ?? null;
}

export type PostInput = Pick<Post, "title" | "caption" | "image" | "product_ids" | "active"> & { id?: string };

export async function savePost(p: PostInput) {
  const s = db();
  if (!s) {
    const d = demo();
    const i = d.posts.findIndex((x) => x.id === p.id);
    if (i >= 0) d.posts[i] = { ...d.posts[i], ...p, id: d.posts[i].id };
    else
      d.posts.push({
        ...p,
        id: crypto.randomUUID(),
        number: d.posts.reduce((m, x) => Math.max(m, x.number), 0) + 1,
        created_at: new Date().toISOString(),
      });
    return;
  }
  const { id, ...rest } = p;
  const { error } = id ? await s.from("posts").update(rest).eq("id", id) : await s.from("posts").insert(rest);
  fail(error);
}

export async function deletePost(id: string) {
  const s = db();
  if (!s) {
    demo().posts = demo().posts.filter((p) => p.id !== id);
    return;
  }
  const { error } = await s.from("posts").delete().eq("id", id);
  fail(error);
}

export type { OrderStatus };
