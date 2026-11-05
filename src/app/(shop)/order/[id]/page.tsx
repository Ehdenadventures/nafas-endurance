import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder } from "@/lib/data";
import { money, site, whatsappLink } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order received", robots: { index: false } };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const o = await getOrder(id);
  if (!o) notFound();
  const wa = whatsappLink(`Hi ${site.name}, about my order #${o.number}`);
  return (
    <div className="mx-auto max-w-xl py-12 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-accent">Thank you, {o.customer_name.split(" ")[0]}</p>
      <h1 className="mt-2 text-3xl font-extrabold">Order #{o.number} received</h1>
      <p className="mt-3 text-ink-2">We&apos;ll contact you on {o.phone} to confirm. You pay <b>{money(o.total)}</b> in cash when it arrives.</p>
      <ul className="mx-auto mt-6 max-w-sm space-y-1 rounded-2xl border border-line bg-surface p-4 text-left text-sm">
        {o.items.map((i, k) => (
          <li key={k} className="flex justify-between gap-2"><span>{i.qty} × {i.name}{i.colour && ` · ${i.colour}`}{i.personalization && ` (${i.personalization})`}</span><span>{money(i.qty * i.price)}</span></li>
        ))}
        <li className="flex justify-between border-t border-line pt-2"><span>Delivery</span><span>{money(o.delivery_fee)}</span></li>
        <li className="flex justify-between font-bold"><span>Total</span><span>{money(o.total)}</span></li>
      </ul>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn">Keep shopping</Link>
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Message us on WhatsApp</a>}
      </div>
    </div>
  );
}
