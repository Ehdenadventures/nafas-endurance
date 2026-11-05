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
