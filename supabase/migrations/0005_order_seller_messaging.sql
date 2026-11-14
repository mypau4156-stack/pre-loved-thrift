alter table public.order_messages
  drop constraint if exists order_messages_sender_check;

alter table public.order_messages
  add constraint order_messages_sender_check
  check (sender in ('rider', 'customer', 'seller'));

alter table public.order_messages
  add column if not exists channel text not null default 'delivery';

alter table public.order_messages
  drop constraint if exists order_messages_channel_check;

alter table public.order_messages
  add constraint order_messages_channel_check
  check (channel in ('delivery', 'buyer-seller', 'rider-seller'));

drop policy if exists order_messages_select on public.order_messages;
create policy order_messages_select on public.order_messages for select to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (
        public.is_seller()
        or (o.buyer_id = auth.uid() and channel in ('delivery', 'buyer-seller'))
        or (public.is_rider() and o.rider_id = auth.uid() and channel in ('delivery', 'rider-seller'))
      )
  )
);

drop policy if exists order_messages_insert on public.order_messages;
create policy order_messages_insert on public.order_messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and (
    (sender = 'customer' and channel in ('delivery', 'buyer-seller') and exists (
      select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid()
    ))
    or
    (sender = 'rider' and channel in ('delivery', 'rider-seller') and exists (
      select 1 from public.orders o where o.id = order_id and o.rider_id = auth.uid()
    ))
    or
    (sender = 'seller' and channel in ('buyer-seller', 'rider-seller') and public.is_seller())
  )
);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'order_messages'
    ) then
    alter publication supabase_realtime add table public.order_messages;
  end if;
end
$$;
