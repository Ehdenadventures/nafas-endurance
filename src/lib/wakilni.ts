import "server-only";
import { request } from "node:https";
import type { Order } from "./types";

/*
 * Wakilni delivery integration, following https://wiki.wakilni.com/integrations/api.md
 *
 * Flow for each order: get token -> start bulk (pickup at your place) -> add delivery -> end bulk.
 * Not yet tested against Wakilni: try it on their test server (WAKILNI_BASE_URL=https://api-dev.wakilni.com,
 * account from dev.wakilni.com/sign-up) before switching to https://api.wakilni.com.
 */

const cfg = () => ({
  base: process.env.WAKILNI_BASE_URL || "https://api-dev.wakilni.com",
  key: process.env.WAKILNI_KEY || "",
  secret: process.env.WAKILNI_SECRET || "",
  pickupLocationId: Number(process.env.WAKILNI_PICKUP_LOCATION_ID || 1),
  pickupArea: process.env.WAKILNI_PICKUP_AREA || "",
  pickupLat: Number(process.env.WAKILNI_PICKUP_LAT || 0),
  pickupLng: Number(process.env.WAKILNI_PICKUP_LNG || 0),
  pickupFloor: Number(process.env.WAKILNI_PICKUP_FLOOR || 0),
});

export const wakilniConfigured = () => Boolean(process.env.WAKILNI_KEY && process.env.WAKILNI_SECRET);
export const wakilniAutoSend = () => wakilniConfigured() && process.env.WAKILNI_AUTO_SEND === "true";

// Wakilni's auth endpoint is a GET with a JSON body, which fetch() refuses, so use node:https directly.
function call(method: string, url: string, body?: unknown, token?: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? "" : JSON.stringify(body);
    const req = request(
      url,
      {
        method,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        timeout: 20000,
      },
      (res) => {
        let text = "";
        res.on("data", (c) => (text += c));
        res.on("end", () => {
          let json: Record<string, unknown> = {};
          try {
            json = JSON.parse(text);
          } catch {
            json = { raw: text };
          }
          if ((res.statusCode ?? 500) >= 400)
            reject(new Error(`Wakilni ${res.statusCode}: ${String(json.message ?? text).slice(0, 300)}`));
          else resolve(json);
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("Wakilni request timed out")));
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const splitName = (full: string) => {
  const parts = full.trim().split(/\s+/);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") || "-" };
};

/** Creates a cash-on-delivery order at Wakilni. Returns the tracking reference. */
export async function sendToWakilni(order: Order): Promise<string> {
  const c = cfg();
  if (!c.key || !c.secret) throw new Error("Wakilni keys are not set (WAKILNI_KEY, WAKILNI_SECRET)");

  const auth = await call("GET", `${c.base}/api/v2/third_party/auth_token`, { key: c.key, secret: c.secret });
  const token = String(auth.token ?? "");
  if (!token) throw new Error("Wakilni did not return a token");

  const bulk = await call(
    "POST",
    `${c.base}/api/v2/clients/start_bulk`,
    { location_id: c.pickupLocationId, longitude: c.pickupLng, latitude: c.pickupLat, floor: c.pickupFloor, area: c.pickupArea },
    token,
  );
  const bulkId = bulk.bulk_id;
  if (bulkId === undefined || bulkId === null) throw new Error("Wakilni did not return a bulk_id");

  const { first, last } = splitName(order.customer_name);
  const units = order.items.reduce((a, i) => a + i.qty, 0);
  const delivery = await call(
    "POST",
    `${c.base}/api/v2/clients/add_delivery/${bulkId}`,
    {
      get_order_details: true,
      waybill: order.number,
      receiver_first_name: first,
      receiver_last_name: last,
      receiver_phone_number: order.phone,
      receiver_location_id: order.number,
      receiver_area: order.city,
      receiver_directions: order.address,
      currency: 1, // USD
      cash_collection_type_id: 52, // collect cash on delivery
      collection_amount: order.total,
      note: `Nafas Endurance order #${order.number}${order.notes ? ` - ${order.notes}` : ""}`.slice(0, 250),
      car_needed: false,
      is_express: false,
      packages: [{ quantity: 1, type_id: units > 3 ? 60 : 59, name: `Order #${order.number}`, sku: `NAF-${order.number}` }],
    },
    token,
  );

  await call("POST", `${c.base}/api/v2/clients/end_bulk/${bulkId}`, {}, token);
  return String(delivery.tracking_id ?? delivery.delivery_id ?? delivery.tracking_url ?? "sent");
}
