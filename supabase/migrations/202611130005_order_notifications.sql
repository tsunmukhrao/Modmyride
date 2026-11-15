alter table public.orders add column if not exists customer_email text;
create table if not exists public.order_notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  subject text not null,
  body text not null,
  status text not null default 'pending' check(status in ('pending','sent','failed')),
  provider_message_id text,
  last_error text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists order_notifications_pending_idx on public.order_notifications(created_at) where status='pending';
alter table public.order_notifications enable row level security;
create policy order_notifications_owner_read on public.order_notifications for select using(user_id=auth.uid());
create policy order_notifications_admin_read on public.order_notifications for select using(public.is_admin());
