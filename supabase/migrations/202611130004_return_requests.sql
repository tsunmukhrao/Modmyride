create unique index if not exists orders_id_user_uidx on public.orders(id,user_id);
create table if not exists public.order_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('cancel','return')),
  reason text not null check(length(reason) between 5 and 1000),
  item_ids uuid[] not null default '{}',
  status text not null default 'pending' check(status in ('pending','approved','rejected','completed')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_requests_user_owns_order foreign key(order_id,user_id) references public.orders(id,user_id) on delete cascade
);
create index if not exists order_requests_user_created_idx on public.order_requests(user_id,created_at desc);
create unique index if not exists one_active_order_request_per_kind_idx on public.order_requests(order_id,kind) where status in ('pending','approved');
alter table public.order_requests enable row level security;
create policy order_requests_owner_read on public.order_requests for select using(user_id=auth.uid());
create policy order_requests_owner_insert on public.order_requests for insert with check(user_id=auth.uid() and status='pending' and exists(select 1 from public.orders o where o.id=order_id and o.user_id=auth.uid()));
create policy order_requests_admin_manage on public.order_requests for all using(public.is_admin()) with check(public.is_admin());
