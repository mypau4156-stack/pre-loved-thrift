alter table public.orders
  add column if not exists payment_verified_at timestamptz;

create or replace function public.confirm_gcash_payment_received(p_order_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  confirmed_at timestamptz;
begin
  if not public.is_seller() then
    raise exception 'Only sellers can confirm GCash payments.' using errcode = '42501';
  end if;

  perform set_config('app.internal_order_update', 'on', true);
  update public.orders
     set payment_verified_at = now()
   where id = p_order_id
     and payment = 'GCash'
     and payment_proof is not null
     and payment_verified_at is null
  returning payment_verified_at into confirmed_at;
  perform set_config('app.internal_order_update', 'off', true);

  if confirmed_at is null then
    raise exception 'This GCash payment has no proof or has already been confirmed.' using errcode = '22023';
  end if;

  return confirmed_at;
end;
$$;

revoke all on function public.confirm_gcash_payment_received(uuid) from public;
grant execute on function public.confirm_gcash_payment_received(uuid) to authenticated;
