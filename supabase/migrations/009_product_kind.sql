-- 009: products can be sports nutrition or 3D printed items.
-- "print" shows Colour instead of Flavour, hides the nutrition badges, and lets the customer type a name to print.
alter table products add column if not exists kind text not null default 'nutrition';
alter table products drop constraint if exists products_kind_check;
alter table products add constraint products_kind_check check (kind in ('nutrition', 'print'));
