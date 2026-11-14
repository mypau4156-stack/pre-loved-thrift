create table if not exists public.buyer_seller_conversations (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (buyer_id, seller_id)
);

create table if not exists public.buyer_seller_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.buyer_seller_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_role text not null check (sender_role in ('buyer', 'seller')),
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists buyer_seller_conversations_buyer_idx
  on public.buyer_seller_conversations(buyer_id, updated_at desc);
create index if not exists buyer_seller_conversations_seller_idx
  on public.buyer_seller_conversations(seller_id, updated_at desc);
create index if not exists buyer_seller_messages_conversation_idx
  on public.buyer_seller_messages(conversation_id, created_at);

create or replace function public.touch_buyer_seller_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.buyer_seller_conversations
     set updated_at = new.created_at
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists buyer_seller_message_touch_conversation on public.buyer_seller_messages;
create trigger buyer_seller_message_touch_conversation
after insert on public.buyer_seller_messages
for each row execute function public.touch_buyer_seller_conversation();

alter table public.buyer_seller_conversations enable row level security;
alter table public.buyer_seller_messages enable row level security;

drop policy if exists buyer_seller_conversations_select on public.buyer_seller_conversations;
create policy buyer_seller_conversations_select on public.buyer_seller_conversations
for select to authenticated
using (buyer_id = auth.uid() or seller_id = auth.uid());

drop policy if exists buyer_seller_messages_select on public.buyer_seller_messages;
create policy buyer_seller_messages_select on public.buyer_seller_messages
for select to authenticated
using (
  exists (
    select 1 from public.buyer_seller_conversations c
    where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  )
);

drop policy if exists buyer_seller_messages_insert on public.buyer_seller_messages;
create policy buyer_seller_messages_insert on public.buyer_seller_messages
for insert to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.buyer_seller_conversations c
    join public.profiles p on p.id = auth.uid()
    where c.id = conversation_id
      and p.role = sender_role
      and (
        (sender_role = 'buyer' and c.buyer_id = auth.uid())
        or (sender_role = 'seller' and c.seller_id = auth.uid())
      )
  )
);

drop policy if exists profiles_select_chat_buyers on public.profiles;
create policy profiles_select_chat_buyers on public.profiles
for select to authenticated
using (
  public.is_seller()
  and exists (
    select 1 from public.buyer_seller_conversations c
    where c.buyer_id = profiles.id and c.seller_id = auth.uid()
  )
);

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

  insert into public.buyer_seller_conversations (buyer_id, seller_id)
  values (auth.uid(), current_seller_id)
  on conflict on constraint buyer_seller_conversations_buyer_id_seller_id_key do update
    set updated_at = public.buyer_seller_conversations.updated_at
  returning id into current_conversation_id;

  return query select current_conversation_id, current_seller_id, current_seller_name;
end;
$$;

revoke all on function public.get_or_create_store_chat() from public;
grant execute on function public.get_or_create_store_chat() to authenticated;

grant select on public.buyer_seller_conversations to authenticated;
grant select, insert on public.buyer_seller_messages to authenticated;
revoke all on public.buyer_seller_conversations from anon;
revoke all on public.buyer_seller_messages from anon;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public'
        and tablename = 'buyer_seller_messages'
    ) then
      alter publication supabase_realtime add table public.buyer_seller_messages;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public'
        and tablename = 'buyer_seller_conversations'
    ) then
      alter publication supabase_realtime add table public.buyer_seller_conversations;
    end if;
  end if;
end
$$;
