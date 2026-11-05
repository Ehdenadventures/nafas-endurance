"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, login, logout } from "@/lib/auth";
import {
  deleteCategory, deletePost, deleteProduct, savePost, type PostInput, getOrder, getProducts, OutOfStockError, returnStock, saveCategory, saveProduct,
  takeStock, updateOrder,
} from "@/lib/data";
import { db, MEDIA_BUCKET } from "@/lib/supabase";
import { cleanVariants } from "@/lib/stock";
import { ORDER_STATUSES, type Media, type OrderStatus, type Variant } from "@/lib/types";
import { sendToWakilni } from "@/lib/wakilni";

const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

function refreshShop() {
  revalidatePath("/", "layout");
}

/* ---------- session ---------- */

export async function loginAction(_: unknown, fd: FormData) {
  if (!process.env.ADMIN_PASSWORD) return { error: "Set ADMIN_PASSWORD in your environment first." };
  if (!(await login(String(fd.get("password") ?? "")))) return { error: "Wrong password." };
  redirect("/admin");
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}

/* ---------- products ---------- */

export type ProductInput = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  category_id: string | null;
  active: boolean;
  personalizable: boolean;
  sort: number;
  stock: number | null;
  variants: Variant[];
  media: Media[];
};

export async function saveProductAction(p: ProductInput): Promise<{ error?: string }> {
  await requireAdmin();
  const name = p.name.trim();
  const slug = slugify(p.slug || name);
  if (!name || !slug) return { error: "Name is required." };
  if (!(p.price >= 0)) return { error: "Price must be 0 or more." };
  const stock = p.stock === null ? null : Math.floor(Number(p.stock));
  if (stock !== null && !(stock >= 0)) return { error: "Stock must be 0 or more, or empty for no limit." };
  const clash = (await getProducts({ includeHidden: true })).find((x) => x.slug === slug && x.id !== p.id);
  if (clash) return { error: `Another product already uses the link "${slug}".` };
  const media = (p.media || [])
    .filter((m) => m && /^https?:\/\//.test(m.url) && (m.type === "image" || m.type === "video"))
    .slice(0, 20);
  try {
    await saveProduct({
      id: p.id, name, slug, description: p.description.trim(), price: Math.round(p.price * 100) / 100,
      category_id: p.category_id || null, active: !!p.active, personalizable: !!p.personalizable,
      sort: Math.floor(p.sort) || 0, stock, variants: cleanVariants(p.variants), media,
    });
  } catch (e) {
    return { error: (e as Error).message };
  }
  refreshShop();
  redirect("/admin/products");
}

export async function deleteProductAction(id: string) {
  await requireAdmin();
  await deleteProduct(id);
  refreshShop();
  redirect("/admin/products");
}

/** Gives the browser a one-time URL to upload a photo or video straight to Supabase Storage. */
export async function createUploadUrl(fileName: string, folder: "products" | "posts" = "products"): Promise<{ uploadUrl: string; publicUrl: string } | { error: string }> {
  await requireAdmin();
  const s = db();
  if (!s) return { error: "Uploads need Supabase. Paste an image URL instead, or connect Supabase." };
  const ext = (fileName.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  const base = slugify(fileName.replace(/\.[^.]+$/, "")) || "file";
  const path = `${folder}/${Date.now()}-${base}.${ext}`;
  const { data, error } = await s.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: error?.message ?? "Could not create upload URL" };
  const { data: pub } = s.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return { uploadUrl: data.signedUrl, publicUrl: pub.publicUrl };
}

/* ---------- Instagram posts ---------- */

export async function savePostAction(p: PostInput): Promise<{ error?: string }> {
  await requireAdmin();
  if (!/^https?:\/\//.test(p.image)) return { error: "Add the post picture first." };
  const known = new Set((await getProducts({ includeHidden: true })).map((x) => x.id));
  const product_ids = [...new Set(p.product_ids.map(String))].filter((id) => known.has(id)).slice(0, 30);
  if (!product_ids.length) return { error: "Pick at least one product that appears in the post." };
  try {
    await savePost({
      id: p.id, title: String(p.title ?? "").trim().slice(0, 120), caption: String(p.caption ?? "").trim().slice(0, 2200),
      image: p.image, product_ids, active: !!p.active,
    });
  } catch (e) {
    return { error: (e as Error).message };
  }
  refreshShop();
  redirect("/admin/posts");
}

export async function deletePostAction(id: string) {
  await requireAdmin();
  await deletePost(id);
  refreshShop();
  redirect("/admin/posts");
}

/* ---------- categories ---------- */

export async function saveCategoryAction(fd: FormData) {
  await requireAdmin();
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return;
  const id = String(fd.get("id") ?? "") || undefined;
  await saveCategory({
    id,
    name,
    slug: slugify(String(fd.get("slug") ?? "") || name),
    description: String(fd.get("description") ?? "").trim(),
    parent_id: String(fd.get("parent_id") ?? "") || null,
    sort: Number(fd.get("sort") ?? 0) || 0,
    active: fd.get("active") === "on",
  });
  refreshShop();
}

export async function deleteCategoryAction(fd: FormData) {
  await requireAdmin();
  await deleteCategory(String(fd.get("id")));
  refreshShop();
}

/* ---------- orders ---------- */

export async function setOrderStatusAction(fd: FormData) {
  await requireAdmin();
  const status = String(fd.get("status")) as OrderStatus;
  if (!ORDER_STATUSES.includes(status)) return;
  const o = await getOrder(String(fd.get("id")));
  if (!o || o.status === status) return;
  // Cancelling puts the items back in stock; un-cancelling takes them again if there is enough.
  if (status === "cancelled") await returnStock(o.items);
  else if (o.status === "cancelled") {
    try {
      await takeStock(o.items);
    } catch (e) {
      if (!(e instanceof OutOfStockError)) throw e;
    }
  }
  await updateOrder(o.id, { status });
  refreshShop();
}

export async function sendToWakilniAction(fd: FormData) {
  await requireAdmin();
  const o = await getOrder(String(fd.get("id")));
  if (!o) return;
  try {
    const ref = await sendToWakilni(o);
    await updateOrder(o.id, { delivery_status: "sent", delivery_ref: ref, delivery_error: null, status: o.status === "new" ? "confirmed" : o.status });
  } catch (e) {
    await updateOrder(o.id, { delivery_status: "failed", delivery_error: (e as Error).message });
  }
  revalidatePath("/admin");
}
