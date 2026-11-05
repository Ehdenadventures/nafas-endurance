"use client";
import { deleteCategoryAction } from "../actions";

export default function DeleteButton({ name, products, subs }: { name: string; products: number; subs: number }) {
  const lines = [`Delete "${name}"? This can't be undone.`];
  if (products) lines.push(`${products} product${products > 1 ? "s" : ""} will have no category (they stay in the shop list in admin).`);
  if (subs) lines.push(`Its ${subs} subcategor${subs > 1 ? "ies" : "y"} will become main categories.`);
  return (
    <button
      formAction={deleteCategoryAction}
      onClick={(e) => { if (!confirm(lines.join("\n\n"))) e.preventDefault(); }}
      className="btn py-2 text-sm text-bad"
    >
      Delete
    </button>
  );
}
