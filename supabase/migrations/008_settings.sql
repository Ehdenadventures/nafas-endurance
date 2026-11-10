-- Site settings edited from the admin (e.g. the home banner background). Run once in Supabase > SQL Editor.
create table if not exists settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table settings enable row level security;

notify pgrst, 'reload schema';
