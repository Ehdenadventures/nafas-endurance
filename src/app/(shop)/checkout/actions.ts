"use server";
import { revalidatePath } from "next/cache";
import { createOrder, getProductById, OutOfStockError, returnStock, takeStock, updateOrder } from "@/lib/data";
import { site } from "@/lib/site";
import { hasColours, stockFor } from "@/lib/stock";
import type { OrderItem } from "@/lib/types";
import { sendToWakilni, wakilniAutoSend } from "@/lib/wakilni";

export type CheckoutInput = {
  name: string;
  phone: string;
  city: string;
  address: string;
  notes: string;
  items: { productId: string; qty: number; personalization: string; colour?: string; package?: string }[];
};

export type CheckoutResult = { ok: true; orderId: string } | { ok: false; error: string };

const clean = (s: unknown, max: number) => String(s ?? "").trim().slice(0, max);

export async function placeOrder(input: CheckoutInput): Promise<CheckoutResult> {
  const name = clean(input.name, 80);
  const phone = clean(input.phone, 30);
  const city = clean(input.city, 80);
  const address = clean(input.address, 300);
  const notes = clean(input.notes, 500);
  if (!name || !phone || !city || !address) return { ok: false, error: "Please fill in your name, phone, area and address." };
  if (phone.replace(/\D/g, "").length < 7) return { ok: false, error: "Please check your phone number." };
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 50) return { ok: false, error: "Your cart is empty." };

  // Prices always come from the database, never from the browser.
  const items: OrderItem[] = [];
  let tracksStock = false;
  for (const it of input.items) {
    const p = await getProductById(String(it.productId));
    if (!p || !p.active) return { ok: false, error: "An item in your cart is no longer available. Please remove it and try again." };
    const qty = Math.max(1, Math.min(99, Math.floor(Number(it.qty) || 1)));
    const personalization = clean(it.personalization, 30);
    if (p.personalizable && !personalization) return { ok: false, error: `Please add the requested note for "${p.name}".` };
    let colour: string | undefined;
    if (hasColours(p)) {
      colour = p.variants.find((v) => v.name === clean(it.colour, 40))?.name;
      if (!colour) return { ok: false, error: `Please choose a flavour for "${p.name}". Remove it from your cart and add it again.` };
    }
    let pack: { name: string; price: number; units: number } | undefined;
    if (p.packages.length) {
      pack = p.packages.find((x) => x.name === clean(it.package, 40));
      if (!pack) return { ok: false, error: `Please choose a packaging for "${p.name}". Remove it from your cart and add it again.` };
    }
    const label = [p.name, colour, pack?.name].filter(Boolean).join(" · ");
    const left = stockFor(p, colour, pack?.name);
    if (left !== null && left > 0 && left < qty)
      return { ok: false, error: `Sorry, only ${left} left of "${label}". Please lower the quantity in your cart.` };
    if (left === 0) return { ok: false, error: `Sorry, "${label}" is sold out. Please remove it from your cart.` };
    if (left !== null) tracksStock = true;
    items.push({
      product_id: p.id, slug: p.slug, name: p.name, price: pack ? pack.price : p.price, qty, personalization,
      ...(colour ? { colour } : {}), ...(pack ? { package: pack.name, units: pack.units } : {}),
    });
  }
  const subtotal = Math.round(items.reduce((a, i) => a + i.price * i.qty, 0) * 100) / 100;
  const delivery_fee = site.deliveryFee;
  const total = subtotal + delivery_fee;

  // Reserve the stock first so two people can't buy the last piece.
  try {
    await takeStock(items);
  } catch (e) {
    if (e instanceof OutOfStockError)
      return {
        ok: false,
        error: e.left === 0
          ? `Sorry, "${e.productName}" just sold out. Please remove it from your cart.`
          : `Sorry, only ${e.left} left of "${e.productName}". Please lower the quantity in your cart.`,
      };
    console.error("takeStock failed", e);
    return { ok: false, error: "We couldn't save your order. Please try again, or message us on WhatsApp." };
  }

  try {
    const order = await createOrder({ customer_name: name, phone, city, address, notes, items, subtotal, delivery_fee, total });
    if (wakilniAutoSend()) {
      try {
        const ref = await sendToWakilni(order);
        await updateOrder(order.id, { delivery_status: "sent", delivery_ref: ref, delivery_error: null });
      } catch (e) {
        // The order is saved either way; the admin page shows the error and a retry button.
        await updateOrder(order.id, { delivery_status: "failed", delivery_error: (e as Error).message });
      }
    }
    if (tracksStock) revalidatePath("/", "layout");
    return { ok: true, orderId: order.id };
  } catch (e) {
    console.error("placeOrder failed", e);
    await returnStock(items).catch(() => {});
    return { ok: false, error: "We couldn't save your order. Please try again, or message us on WhatsApp." };
  }
}
