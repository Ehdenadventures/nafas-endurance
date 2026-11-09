-- Stock per packaging and flavour (e.g. 40 single Limone gels and 5 boxes of 24 Limone).
-- Run this once in Supabase > SQL Editor.
-- packages[].stock = {"Limone": 5, "Arancia": 3}; the key "" is used when the product has no flavours.
-- A missing or null value means no limit. Products without packaging keep using the flavour or product stock.
-- Order lines carry "packs" (how many of that packaging) and "qty" (single pieces, for the old way).

create or replace function take_stock(p_items jsonb) returns void
language plpgsql as $$
declare
  it record;
  p products%rowtype;
  v jsonb;
  pk jsonb;
  vstock int;
  found_colour boolean;
begin
  for it in
    select (e->>'product_id')::uuid as pid, coalesce(e->>'colour', '') as colour, coalesce(e->>'package', '') as package,
           sum(coalesce((e->>'packs')::int, (e->>'qty')::int)) as packs, sum((e->>'qty')::int) as qty, max(e->>'name') as name
    from jsonb_array_elements(p_items) e group by 1, 2, 3 order by 1, 2, 3
  loop
    select * into p from products where id = it.pid for update;
    if not found then continue; end if;

    -- Products with packaging: stock lives on the packaging, per flavour.
    pk := null;
    if it.package <> '' then
      select x into pk from jsonb_array_elements(p.packages) x where x->>'name' = it.package limit 1;
    end if;
    if pk is not null then
      if pk->'stock'->>it.colour is null or pk->'stock'->>it.colour = '' then continue; end if;
      vstock := (pk->'stock'->>it.colour)::int;
      if vstock < it.packs then
        raise exception 'OUT_OF_STOCK|%|%', it.name || ' (' || concat_ws(', ', nullif(it.colour, ''), it.package) || ')', vstock;
      end if;
      update products set packages = (
        select jsonb_agg(case when x->>'name' = it.package
                              then jsonb_set(x, array['stock', it.colour], to_jsonb(vstock - it.packs)) else x end order by n)
        from jsonb_array_elements(p.packages) with ordinality t(x, n)
      ) where id = it.pid;
      continue;
    end if;

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
  pk jsonb;
begin
  for it in
    select (e->>'product_id')::uuid as pid, coalesce(e->>'colour', '') as colour, coalesce(e->>'package', '') as package,
           sum(coalesce((e->>'packs')::int, (e->>'qty')::int)) as packs, sum((e->>'qty')::int) as qty
    from jsonb_array_elements(p_items) e group by 1, 2, 3 order by 1, 2, 3
  loop
    select * into p from products where id = it.pid for update;
    if not found then continue; end if;
    pk := null;
    if it.package <> '' then
      select x into pk from jsonb_array_elements(p.packages) x where x->>'name' = it.package limit 1;
    end if;
    if pk is not null then
      if coalesce(pk->'stock'->>it.colour, '') <> '' then
        update products set packages = (
          select jsonb_agg(case when x->>'name' = it.package
                                then jsonb_set(x, array['stock', it.colour], to_jsonb((x->'stock'->>it.colour)::int + it.packs)) else x end order by n)
          from jsonb_array_elements(p.packages) with ordinality t(x, n)
        ) where id = it.pid;
      end if;
    elsif it.colour <> '' and exists (select 1 from jsonb_array_elements(p.variants) x where x->>'name' = it.colour) then
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
