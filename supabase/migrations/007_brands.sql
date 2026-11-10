-- Brands for the moving strip on the home page. Run this once in Supabase > SQL Editor.
-- is_brand = show this category in the brand strip; logo = link to its logo picture.
alter table categories add column if not exists is_brand boolean not null default false;
alter table categories add column if not exists logo text;

notify pgrst, 'reload schema';
