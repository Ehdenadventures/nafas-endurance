import { requireAdmin } from "@/lib/auth";
import { getOrders } from "@/lib/data";
import { money } from "@/lib/site";
import { ORDER_STATUSES } from "@/lib/types";
import { wakilniConfigured } from "@/lib/wakilni";
import AdminNav from "./AdminNav";
import { sendToWakilniAction, setOrderStatusAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  await requireAdmin();
  const orders = await getOrders();
  const open = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const wak = wakilniConfigured();
  const waLink = (phone: string, n: number) => `https://wa.me/${phone.replace(/\D/g, "").replace(/^0+/, "").replace(/^(?!961)/, "961")}?text=${encodeURIComponent(`Hi, this is Nafas Endurance about your order #${n}.`)}`;
  return (
    <>
      <AdminNav active="orders" />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-sm text-ink-3">{open.length} open · {orders.length} total · {money(open.reduce((a, o) => a + o.total, 0))} to collect</p>
        </div>
        {!wak && <p className="mt-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink-2">Wakilni isn&apos;t connected yet. Add WAKILNI_KEY and WAKILNI_SECRET to send orders with one click.</p>}
        <div className="mt-4 space-y-3">
          {orders.map((o) => (
            <article key={o.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold">#{o.number} · {o.customer_name}</h2>
                  <p className="text-sm text-ink-2">
                    <a href={waLink(o.phone, o.number)} target="_blank" rel="noopener noreferrer" className="underline">{o.phone}</a> · {o.city}
                  </p>
                  <p className="text-sm text-ink-3">{o.address}</p>
                  {o.notes && <p className="mt-1 text-sm">Note: {o.notes}</p>}
                  <p className="mt-1 text-xs text-ink-3">{new Date(o.created_at).toLocaleString("en-GB", { timeZone: "Asia/Beirut" })}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">{money(o.total)}</p>
                  <form action={setOrderStatusAction} className="mt-2 flex items-center gap-2">
                    <input type="hidden" name="id" value={o.id} />
                    <select name="status" defaultValue={o.status} className="input py-1.5 text-sm">
                      {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button className="btn py-1.5 text-sm">Save</button>
                  </form>
                </div>
              </div>
              <ul className="mt-3 space-y-0.5 border-t border-line pt-3 text-sm">
                {o.items.map((i, k) => (
                  <li key={k}>{i.qty} × {i.name}{i.colour && <b> · {i.colour}</b>}{i.personalization && <b> · “{i.personalization}”</b>} <span className="text-ink-3">({money(i.price)})</span></li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <span className="text-ink-2">Wakilni: <b>{o.delivery_status.replace("_", " ")}</b>{o.delivery_ref && ` · ${o.delivery_ref}`}</span>
                {o.delivery_error && <span className="text-bad">{o.delivery_error}</span>}
                {wak && o.delivery_status !== "sent" && o.status !== "cancelled" && (
                  <form action={sendToWakilniAction}><input type="hidden" name="id" value={o.id} /><button className="btn btn-primary py-1.5 text-sm">Send to Wakilni</button></form>
                )}
              </div>
            </article>
          ))}
          {!orders.length && <p className="py-12 text-center text-ink-3">No orders yet.</p>}
        </div>
      </main>
    </>
  );
}
