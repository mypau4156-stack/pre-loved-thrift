drop policy if exists products_storefront_select on public.products;
create policy products_storefront_select on public.products
for select to anon
using (active = true and stock > 0);

grant select (
  seller_id,
  id,
  name,
  price,
  image,
  category,
  type,
  slot,
  fit,
  active,
  stock,
  created_at
) on public.products to anon;
