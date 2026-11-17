alter table public.order_messages
  drop constraint if exists order_messages_sender_check;

alter table public.order_messages
  add constraint order_messages_sender_check
  check (sender in ('rider', 'customer', 'seller', 'buyer'));

create or replace function public.normalize_order_message_sender()
returns trigger
language plpgsql
as $$
begin
  if new.sender = 'buyer' then
    new.sender = 'customer';
  end if;

  if new.sender not in ('rider', 'customer', 'seller') then
    raise exception 'Invalid order message sender: %', new.sender;
  end if;

  return new;
end;
$$;

drop trigger if exists order_messages_normalize_sender on public.order_messages;

create trigger order_messages_normalize_sender
before insert or update on public.order_messages
for each row
execute function public.normalize_order_message_sender();
