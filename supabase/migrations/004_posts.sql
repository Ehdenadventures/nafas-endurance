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
