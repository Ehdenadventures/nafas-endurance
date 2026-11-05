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
