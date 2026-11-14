alter table public.products
  add column if not exists slot text
    check (slot in ('dress', 'top', 'bottom', 'shoes')),
  add column if not exists fit jsonb;

create or replace function public.validate_order_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  product public.products%rowtype;
  house public.house_products%rowtype;
begin
  if new.product_id is not null then
    select * into product from public.products where id = new.product_id;
    if not found or not product.active then
      raise exception 'This product is not available.' using errcode = 'P0001';
    end if;
    if product.stock < new.quantity then
      raise exception 'Not enough stock for %.', product.name using errcode = 'P0001';
    end if;
    new.name := product.name;
    new.price := product.price;
    new.image := product.image;
    new.cat := product.category;
    new.type := product.type;
    new.slot := product.slot;
    new.fit := product.fit;
  else
    select * into house from public.house_products where product_key = new.product_key and active;
    if not found then
      raise exception 'This product is not available.' using errcode = 'P0001';
    end if;
    new.name := house.name;
    new.price := house.price;
    new.image := house.image;
    new.cat := house.category;
    new.type := house.type;
    new.slot := house.slot;
    new.fit := house.fit;
  end if;
  return new;
end;
$$;
