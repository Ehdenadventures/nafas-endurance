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
