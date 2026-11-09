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
