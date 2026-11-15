create or replace function public.get_or_create_store_chat()
returns table (conversation_id uuid, seller_id uuid, seller_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_seller_id uuid;
  current_seller_name text;
  current_conversation_id uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'buyer'
  ) then
    raise exception 'Sign in with a buyer account to message the seller.';
  end if;

  select p.id, p.full_name
    into current_seller_id, current_seller_name
    from public.profiles p
   where p.role = 'seller'
   order by p.created_at
   limit 1;

  if current_seller_id is null then
    raise exception 'The shop seller is not available yet.';
  end if;

  insert into public.buyer_seller_conversations as existing (buyer_id, seller_id)
  values (auth.uid(), current_seller_id)
  on conflict on constraint buyer_seller_conversations_buyer_id_seller_id_key do update
    set updated_at = existing.updated_at
  returning existing.id into current_conversation_id;

  return query select current_conversation_id, current_seller_id, current_seller_name;
end;
$$;

revoke all on function public.get_or_create_store_chat() from public;
grant execute on function public.get_or_create_store_chat() to authenticated;
