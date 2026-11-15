-- 010: price options, e.g. "Filament type": PLA (+0), PETG (+3), Silk PLA (+4).
-- Run this once in Supabase > SQL Editor. Existing products are not changed.
-- options = [{"name": "Filament type", "choices": [{"name": "PLA", "extra": 0}, {"name": "PETG", "extra": 3}]}]
-- A colour can also add to the price: variants[].extra (stored in the existing variants column, no change needed).
alter table products add column if not exists options jsonb not null default '[]'::jsonb;
