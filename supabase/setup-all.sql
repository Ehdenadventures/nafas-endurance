-- Nafas Endurance: full database setup in one go. Paste all of this into Supabase > SQL Editor and press Run.
-- It is schema.sql + migrations/002-005 + seed.sql, in order.

-- ===== supabase/schema.sql =====
-- Nafas Endurance database schema.
-- Run this once in Supabase: Dashboard > SQL Editor > New query > paste > Run.
-- Then run supabase/seed.sql to load the starting catalog.

create extension if not exists "pgcrypto";

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  parent_id uuid references categories(id) on delete set null,
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  category_id uuid references categories(id) on delete set null,
  active boolean not null default true,
  personalizable boolean not null default false,
  sort int not null default 0,
  -- how many are ready to sell; null = no limit (made to order)
  stock int check (stock is null or stock >= 0),
  -- colours: list of {"name": "Red", "hex": "#e53935", "stock": 5 | null}
  variants jsonb not null default '[]'::jsonb,
  -- list of {"type": "image" | "video", "url": "..."}; the first image is the cover
  media jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity,
  customer_name text not null,
  phone text not null,
  city text not null,
  address text not null,
  notes text not null default '',
  -- list of {"product_id","slug","name","price","qty","personalization"}
  items jsonb not null,
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  currency text not null default 'USD',
  payment_method text not null default 'cash_on_delivery',
  status text not null default 'new'
    check (status in ('new','confirmed','packing','shipped','delivered','cancelled')),
  delivery_status text not null default 'not_sent',
  delivery_ref text,
  delivery_error text,
  created_at timestamptz not null default now()
);

create index if not exists products_category_idx on products(category_id);
create index if not exists orders_created_idx on orders(created_at desc);

-- The website talks to the database only from the server with the service role key,
-- so lock the tables against the public (anon) key.
alter table categories enable row level security;
alter table products enable row level security;
alter table orders enable row level security;

-- Public bucket for product photos and videos.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Stock functions (take_stock / return_stock) live in migrations/; run 002_stock.sql then 003_colours.sql after this file.

-- ===== supabase/migrations/002_stock.sql =====
-- Stock per product. Run this once in Supabase > SQL Editor.
-- stock = null means "no limit" (made to order); a number is how many you have ready.

alter table products add column if not exists stock int check (stock is null or stock >= 0);

-- Takes stock for every item of an order in one go. If any item has too few left,
-- nothing changes and it fails with OUT_OF_STOCK|<product name>|<how many left>.
create or replace function take_stock(p_items jsonb) returns void
language plpgsql as $$
declare
  it record;
  left_now int;
begin
  for it in
    select (e->>'product_id')::uuid as pid, sum((e->>'qty')::int) as qty, max(e->>'name') as name
    from jsonb_array_elements(p_items) e group by 1
  loop
    update products set stock = stock - it.qty
    where id = it.pid and stock is not null and stock >= it.qty;
    if not found then
      select stock into left_now from products where id = it.pid;
      if left_now is not null then
        raise exception 'OUT_OF_STOCK|%|%', it.name, left_now;
      end if;
    end if;
  end loop;
end $$;

-- Puts stock back, e.g. when an order is cancelled.
create or replace function return_stock(p_items jsonb) returns void
language plpgsql as $$
begin
  update products p set stock = p.stock + x.qty
  from (
    select (e->>'product_id')::uuid as pid, sum((e->>'qty')::int) as qty
    from jsonb_array_elements(p_items) e group by 1
  ) x
  where p.id = x.pid and p.stock is not null;
end $$;

-- Only the website's server (service role) may call these.
revoke execute on function take_stock(jsonb) from public, anon, authenticated;
revoke execute on function return_stock(jsonb) from public, anon, authenticated;

-- ===== supabase/migrations/003_colours.sql =====
-- Colours per product, each with its own stock. Run this once in Supabase > SQL Editor.
-- variants = list of {"name": "Red", "hex": "#e53935", "stock": 5}; stock null = no limit.
-- A product with colours uses the colour stock; its own stock field is then ignored.

alter table products add column if not exists variants jsonb not null default '[]'::jsonb;

-- Takes stock for every item of an order in one go (items may carry a "colour").
-- If anything is short, nothing changes and it fails with OUT_OF_STOCK|<name>|<how many left>.
create or replace function take_stock(p_items jsonb) returns void
language plpgsql as $$
declare
  it record;
  p products%rowtype;
  v jsonb;
  vstock int;
  found_colour boolean;
begin
  for it in
    select (e->>'product_id')::uuid as pid, coalesce(e->>'colour', '') as colour,
           sum((e->>'qty')::int) as qty, max(e->>'name') as name
    from jsonb_array_elements(p_items) e group by 1, 2 order by 1, 2
  loop
    select * into p from products where id = it.pid for update;
    if not found then continue; end if;
    found_colour := false;
    if it.colour <> '' then
      select x into v from jsonb_array_elements(p.variants) x where x->>'name' = it.colour limit 1;
      found_colour := v is not null;
    end if;
    if found_colour then
      if v->>'stock' is null or v->>'stock' = '' then continue; end if;
      vstock := (v->>'stock')::int;
      if vstock < it.qty then
        raise exception 'OUT_OF_STOCK|%|%', it.name || ' (' || it.colour || ')', vstock;
      end if;
      update products set variants = (
        select jsonb_agg(case when x->>'name' = it.colour then jsonb_set(x, '{stock}', to_jsonb((x->>'stock')::int - it.qty)) else x end order by n)
        from jsonb_array_elements(p.variants) with ordinality t(x, n)
      ) where id = it.pid;
    elsif p.stock is not null then
      if p.stock < it.qty then
        raise exception 'OUT_OF_STOCK|%|%', it.name, p.stock;
      end if;
      update products set stock = stock - it.qty where id = it.pid;
    end if;
  end loop;
end $$;

-- Puts stock back, e.g. when an order is cancelled.
create or replace function return_stock(p_items jsonb) returns void
language plpgsql as $$
declare
  it record;
  p products%rowtype;
begin
  for it in
    select (e->>'product_id')::uuid as pid, coalesce(e->>'colour', '') as colour, sum((e->>'qty')::int) as qty
    from jsonb_array_elements(p_items) e group by 1, 2 order by 1, 2
  loop
    select * into p from products where id = it.pid for update;
    if not found then continue; end if;
    if it.colour <> '' and exists (select 1 from jsonb_array_elements(p.variants) x where x->>'name' = it.colour) then
      update products set variants = (
        select jsonb_agg(case when x->>'name' = it.colour and coalesce(x->>'stock', '') <> ''
                              then jsonb_set(x, '{stock}', to_jsonb((x->>'stock')::int + it.qty)) else x end order by n)
        from jsonb_array_elements(p.variants) with ordinality t(x, n)
      ) where id = it.pid;
    elsif p.stock is not null then
      update products set stock = stock + it.qty where id = it.pid;
    end if;
  end loop;
end $$;

revoke execute on function take_stock(jsonb) from public, anon, authenticated;
revoke execute on function return_stock(jsonb) from public, anon, authenticated;

-- ===== supabase/migrations/004_posts.sql =====
-- Instagram posts you can shop from the website (your site /ig).
-- Run this once in Supabase > SQL Editor.

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique,   -- short link: /ig/<number>
  title text not null default '',
  caption text not null default '',
  image text not null default '',
  product_ids jsonb not null default '[]'::jsonb,       -- products shown in the post, in order
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists posts_created_idx on posts(created_at desc);
alter table posts enable row level security;

-- ===== supabase/migrations/005_product_details.sql =====
-- Product page extras. Run this once in Supabase > SQL Editor.
-- packages = ways the product is sold, each with its own price, e.g.
--   [{"name": "1 gel", "price": 2.2, "units": 1}, {"name": "Box of 24", "price": 52.8, "units": 24}]
--   units = how many single pieces it takes from stock.
-- details  = information tabs, e.g. [{"title": "Ingredients", "body": "..."}]
-- features = badges: "gluten_free", "vegan", "lactose_free", "low_sugar"

alter table products add column if not exists packages jsonb not null default '[]'::jsonb;
alter table products add column if not exists details jsonb not null default '[]'::jsonb;
alter table products add column if not exists features jsonb not null default '[]'::jsonb;

-- Tell the API about the new columns straight away.
notify pgrst, 'reload schema';

-- ===== supabase/seed.sql =====
-- Starting catalog for Nafas Endurance. Safe to run once after schema.sql.

insert into categories (slug,name,description,sort,active) values ('ultimate-italia','Ultimate Italia','Italian sports nutrition: energy gels and endurance fuel for running, cycling and triathlon.',0,true) on conflict (slug) do nothing;
insert into categories (slug,name,description,parent_id,sort,active) values ('ultimate-italia-gels','Energy gels','',(select id from categories where slug='ultimate-italia'),0,true) on conflict (slug) do nothing;

insert into products (slug,name,description,price,category_id,active,personalizable,sort,media) values ('ultimate-enduro-gel','Ultimate Enduro Gel','Energy gel for long efforts. Check the pack for flavour, size and nutrition facts.',3,(select id from categories where slug='ultimate-italia-gels'),true,false,0,'[]'::jsonb) on conflict (slug) do nothing;
insert into products (slug,name,description,price,category_id,active,personalizable,sort,media) values ('ultimate-energel','Ultimate Energel','Quick energy gel for training and race day. Check the pack for flavour, size and nutrition facts.',3,(select id from categories where slug='ultimate-italia-gels'),true,false,1,'[]'::jsonb) on conflict (slug) do nothing;
insert into products (slug,name,description,price,category_id,active,personalizable,sort,media) values ('ultimate-ultra-energy-gel','Ultimate Ultra Energy Gel','Energy gel for ultra distances. Check the pack for flavour, size and nutrition facts.',3,(select id from categories where slug='ultimate-italia-gels'),true,false,2,'[]'::jsonb) on conflict (slug) do nothing;
