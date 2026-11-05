# Nafas Endurance

Online shop for energy gels and endurance nutrition from several brands, starting with
**Ultimate Italia**. Brand pages, product pages with photos and videos, flavours with their own
stock, cart, cash-on-delivery checkout, a "Shop our Instagram" page, and an admin page to manage
brands, products, posts and orders. Orders can be sent to Wakilni for delivery.

Built the same way as the 3D PrintLab LB shop: Next.js, hosted on Vercel, data in Supabase.

## What's where

| Path | What it is |
|---|---|
| `/` | Home page |
| `/c/ultimate-italia` | A brand page (each brand is a top-level category; its product lines are subcategories) |
| `/p/<product>` | Product page |
| `/cart`, `/checkout` | Cart and cash-on-delivery checkout |
| `/ig` | Shop our Instagram (put this link in the Instagram bio) |
| `/admin` | Orders, products, brands and Instagram posts (password protected) |

Code: shop pages in `src/app/(shop)`, admin in `src/app/admin`, database access in `src/lib/data.ts`,
Wakilni in `src/lib/wakilni.ts`, shop settings in `src/lib/site.ts`, colours in `src/app/globals.css`,
logo in `src/components/Logo.tsx`.

## Run it on your computer

```bash
npm install
cp .env.example .env.local   # fill in what you have; it runs without Supabase in preview mode
npm run dev                  # open http://localhost:3000
```

Without Supabase the site uses the starting catalog in `src/lib/seed.json` and keeps orders in memory.

## Going live (one time)

1. **Supabase** (free): create a project at supabase.com. In SQL Editor, run `supabase/schema.sql`,
   then `supabase/migrations/002_stock.sql`, `003_colours.sql` (flavours) and `004_posts.sql`
   (Instagram posts), then `supabase/seed.sql` to load the starting catalog. Copy the project URL and the
   `service_role` key from Project Settings > API.
2. **Vercel** (free): import this GitHub repo at vercel.com/new. Add the variables from `.env.example`
   (at least `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `NEXT_PUBLIC_WHATSAPP_NUMBER`,
   `NEXT_PUBLIC_INSTAGRAM`). Deploy.
3. **Domain** (optional): in Vercel > Project > Settings > Domains, add your domain and follow the DNS
   records it shows. Then set `NEXT_PUBLIC_SITE_URL` to it.
4. **Wakilni**: get keys from the Wakilni back office (Settings > Api Tokens). Test with
   `WAKILNI_BASE_URL=https://api-dev.wakilni.com` first, then switch to `https://api.wakilni.com`.

## Before opening the shop

The starting catalog has three Ultimate Italia gels with a **placeholder price of $3** and no photos.
In admin, set the real prices, add photos, descriptions and flavours (Orange, Lemon, Cola, ... with
stock for each), and remove any product you don't carry.

## Day to day

- Add or edit products, photos, videos and flavours at `/admin/products`. The first photo is the cover.
- Add a new brand at `/admin/categories`: create a top-level category with the brand name, then
  optional subcategories under it (Energy gels, Bars, Hydration...). It shows in the menu automatically.
- New orders show at `/admin`. Tap the phone number to WhatsApp the customer, update the status, and
  press **Send to Wakilni** (or set `WAKILNI_AUTO_SEND=true`).
- Shop changes show on the site within a minute.

## Stock and flavours

Each product has a **Stock** field. Empty = no limit, a number = how many you have, 0 = "Sold out".
An order takes the stock when it is placed, cancelling it puts it back. A product can have
**Flavours**, each with its own stock and optionally its own photo; then the main Stock field is not used.

## Shop our Instagram

Admin > **Instagram posts**: add each Instagram post with the same picture and pick the products in it.
Customers open `<your site>/ig` from the Instagram bio, see the posts as a grid, and tap one to order
its items. Each post also has its own link (`/ig/1`, `/ig/2`, ...) for story link stickers.

## Wakilni integration status

Written from Wakilni's API docs but **not yet tested** against their servers. Before going live,
place a test order with the dev keys and check it appears in Wakilni's portal with the right cash amount.
