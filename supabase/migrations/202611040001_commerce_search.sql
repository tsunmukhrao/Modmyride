-- Additive commerce and search foundation. Apply after the existing supabase/schema.sql.

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
create or replace function public.create_profile_for_new_auth_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,full_name,phone,role)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),new.raw_user_meta_data->>'phone','customer')
  on conflict(id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users for each row execute function public.create_profile_for_new_auth_user();
alter table public.categories add column if not exists slug text;
alter table public.categories add column if not exists parent_id uuid references public.categories(id) on delete restrict;
alter table public.categories add column if not exists active boolean not null default true;
alter table public.categories add column if not exists sort_order int not null default 0;
alter table public.categories add column if not exists image_url text;
update public.categories set slug = trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) where slug is null;
create unique index if not exists categories_slug_uidx on public.categories(slug);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(), name text not null unique,
  slug text not null unique, description text not null default '', active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.products add column if not exists brand_id uuid references public.brands(id) on delete set null;
alter table public.products add column if not exists compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= price);
alter table public.products add column if not exists tax_rate numeric(5,2) not null default 18 check (tax_rate >= 0 and tax_rate <= 100);
alter table public.products add column if not exists specifications jsonb not null default '{}';
alter table public.products add column if not exists status text not null default 'active' check (status in ('draft','active','archived'));
alter table public.products add column if not exists deleted_at timestamptz;
alter table public.products add column if not exists popularity int not null default 0 check (popularity >= 0);
create index if not exists products_category_active_idx on public.products(category_id, status) where deleted_at is null;
create index if not exists products_brand_active_idx on public.products(brand_id, status) where deleted_at is null;
create index if not exists products_price_idx on public.products(price) where deleted_at is null and status = 'active';

alter table public.vehicles add column if not exists body_type text;
alter table public.vehicles add column if not exists generation text;
alter table public.vehicles add column if not exists source text not null default 'manual';
alter table public.vehicles add column if not exists source_key text;
create unique index if not exists vehicles_source_key_uidx on public.vehicles(source_key);
create index if not exists vehicles_make_model_year_idx on public.vehicles(make, model, year_from, year_to);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null, alt_text text not null default '', sort_order int not null default 0,
  created_at timestamptz not null default now(), unique(product_id, storage_path)
);
create table if not exists public.product_specs (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  name text not null, value text not null, sort_order int not null default 0, unique(product_id, name)
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  recipient text not null, phone text not null, line1 text not null, line2 text not null default '', city text not null,
  region text not null, postal_code text not null, country_code text not null default 'IN', is_default boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists addresses_one_default_per_user on public.addresses(user_id) where is_default;
create table if not exists public.inventory (
  product_id uuid primary key references public.products(id) on delete cascade,
  quantity int not null default 0 check (quantity >= 0), low_stock_threshold int not null default 5 check (low_stock_threshold >= 0),
  reserved int not null default 0 check (reserved >= 0 and reserved <= quantity), updated_at timestamptz not null default now()
);
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete set null, delta int not null check (delta <> 0), reason text not null,
  reference_id uuid, created_at timestamptz not null default now()
);
create index if not exists stock_movements_product_created_idx on public.stock_movements(product_id, created_at desc);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade,
  guest_token_hash text unique, currency text not null default 'INR', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((user_id is not null)::int + (guest_token_hash is not null)::int = 1)
);
create unique index if not exists carts_user_uidx on public.carts(user_id) where user_id is not null;
create table if not exists public.cart_items (
  cart_id uuid not null references public.carts(id) on delete cascade, product_id uuid not null references public.products(id) on delete cascade,
  quantity int not null check (quantity between 1 and 50), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(cart_id, product_id)
);
create table if not exists public.wishlists (
  user_id uuid not null references auth.users(id) on delete cascade, product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(user_id, product_id)
);

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in ('pending','confirmed','packed','shipped','out_for_delivery','delivered','cancelled','returned','fulfilled'));
alter table public.orders add column if not exists subtotal numeric(12,2) not null default 0;
alter table public.orders add column if not exists discount_total numeric(12,2) not null default 0;
alter table public.orders add column if not exists tax_total numeric(12,2) not null default 0;
alter table public.orders add column if not exists shipping_total numeric(12,2) not null default 0;
alter table public.orders add column if not exists currency text not null default 'INR';
alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists payment_status text not null default 'pending' check (payment_status in ('pending','authorized','paid','failed','partially_refunded','refunded'));
alter table public.orders add column if not exists idempotency_key text;
create unique index if not exists orders_idempotency_user_uidx on public.orders(user_id, idempotency_key) where idempotency_key is not null;
alter table public.order_items add column if not exists product_snapshot jsonb not null default '{}';
create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  old_status text, new_status text not null, note text not null default '', actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists order_status_history_order_idx on public.order_status_history(order_id, created_at);
create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.orders(id) on delete cascade,
  courier text, tracking_number text, tracking_url text, eta timestamptz, shipped_at timestamptz, delivered_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null, provider_reference text, idempotency_key text not null unique,
  amount numeric(12,2) not null check (amount >= 0), currency text not null default 'INR',
  status text not null check (status in ('pending','authorized','paid','failed','partially_refunded','refunded')),
  method text, raw_event jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(provider, provider_reference)
);
alter table public.payments add column if not exists provider_payment_id text;
create unique index if not exists payments_provider_payment_id_uidx on public.payments(provider,provider_payment_id) where provider_payment_id is not null;
create index if not exists payments_order_created_idx on public.payments(order_id, created_at desc);
create unique index if not exists payments_one_pending_razorpay_order_uidx on public.payments(order_id) where provider='razorpay' and status='pending';
create table if not exists public.webhook_events (
  id bigserial primary key, provider text not null, event_id text not null, payload jsonb not null default '{}',
  received_at timestamptz not null default now(), processed_at timestamptz,
  unique(provider,event_id)
);
create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(), payment_id uuid not null references public.payments(id) on delete restrict,
  provider_reference text, amount numeric(12,2) not null check (amount > 0), status text not null check(status in ('pending','succeeded','failed')),
  reason text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(), code text not null unique,
  discount_type text not null check(discount_type in ('percent','fixed')), discount_value numeric(12,2) not null check(discount_value > 0),
  min_cart_value numeric(12,2) not null default 0 check(min_cart_value >= 0), max_discount numeric(12,2),
  usage_limit int, usage_count int not null default 0, per_user_limit int, category_id uuid references public.categories(id) on delete set null,
  starts_at timestamptz not null default now(), expires_at timestamptz, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(), coupon_id uuid not null references public.coupons(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade, order_id uuid not null references public.orders(id) on delete cascade,
  amount numeric(12,2) not null check(amount >= 0), created_at timestamptz not null default now(), unique(coupon_id, order_id)
);
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, order_id uuid not null references public.orders(id) on delete restrict,
  rating int not null check(rating between 1 and 5), title text not null, body text not null,
  status text not null default 'pending' check(status in ('pending','approved','rejected','flagged')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id, product_id)
);
create index if not exists reviews_product_status_idx on public.reviews(product_id, status, created_at desc);
create or replace function public.enforce_verified_review() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='INSERT' then
    if auth.uid() is not null and new.user_id<>auth.uid() and not public.is_admin() then
      raise exception 'Review owner must be the signed-in customer';
    end if;
    if not exists (
      select 1 from public.orders o join public.order_items oi on oi.order_id=o.id
      where o.id=new.order_id and o.user_id=new.user_id and o.status='delivered' and oi.product_id=new.product_id
    ) then raise exception 'A delivered order for this product is required to review'; end if;
    if auth.uid() is not null and not public.is_admin() then new.status := 'pending'; end if;
  elsif auth.uid() is not null and not public.is_admin() and old.user_id=auth.uid() then
    if new.user_id is distinct from old.user_id or new.product_id is distinct from old.product_id or new.order_id is distinct from old.order_id then
      raise exception 'Review ownership and product cannot be changed';
    end if;
    new.status := 'pending';
    new.updated_at := now();
  end if;
  return new;
end; $$;
drop trigger if exists verified_review_guard on public.reviews;
create trigger verified_review_guard before insert or update on public.reviews for each row execute function public.enforce_verified_review();
create table if not exists public.review_votes (
  review_id uuid not null references public.reviews(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
  helpful boolean not null, created_at timestamptz not null default now(), primary key(review_id, user_id)
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null, title text not null, body text not null default '', payload jsonb not null default '{}',
  read_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null, message text not null, status text not null default 'open' check(status in ('open','in_progress','resolved','closed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id) on delete set null,
  action text not null, entity_type text not null, entity_id text, details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);
create table if not exists public.search_queries (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null,
  query text not null, normalized_query text not null, result_count int not null default 0, search_mode text not null,
  duration_ms int, created_at timestamptz not null default now()
);
create table if not exists public.user_events (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade,
  session_id text, product_id uuid references public.products(id) on delete set null,
  event_type text not null check(event_type in ('view','click','add_to_cart','purchase','wishlist')),
  metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create index if not exists user_events_user_created_idx on public.user_events(user_id, created_at desc);
create index if not exists user_events_product_event_idx on public.user_events(product_id, event_type);

create or replace function public.place_order(p_items jsonb, p_shipping jsonb, p_idempotency_key text, p_coupon_code text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); item jsonb; product_row public.products%rowtype; stock_row public.inventory%rowtype;
  order_id uuid; subtotal_value numeric(12,2) := 0; tax_value numeric(12,2) := 0; discount_value numeric(12,2) := 0;
  shipping_value numeric(12,2) := 0; total_value numeric(12,2); qty int; coupon_row public.coupons%rowtype;
begin
  if uid is null then raise exception 'Sign in required'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 8 then raise exception 'Valid idempotency key required'; end if;
  select id into order_id from public.orders where user_id=uid and idempotency_key=p_idempotency_key;
  if order_id is not null then return jsonb_build_object('order_id',order_id,'status','existing'); end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)=0 then raise exception 'Cart is empty'; end if;
  for item in
    select jsonb_build_object('product_id', product_id, 'quantity', sum(quantity))
    from (select (value->>'product_id')::uuid as product_id, (value->>'quantity')::int as quantity
          from jsonb_array_elements(p_items)) as requested_items
    group by product_id order by product_id
  loop
    qty := (item->>'quantity')::int;
    if qty is null or qty < 1 or qty > 50 then raise exception 'Invalid quantity'; end if;
    select * into product_row from public.products where id=(item->>'product_id')::uuid and status='active' and deleted_at is null for share;
    if not found then raise exception 'Product is unavailable'; end if;
    select * into stock_row from public.inventory where product_id=product_row.id for update;
    if not found or stock_row.quantity-stock_row.reserved < qty then raise exception 'Insufficient stock for %', product_row.name; end if;
    subtotal_value := subtotal_value + product_row.price*qty;
    tax_value := tax_value + round(product_row.price*qty*product_row.tax_rate/100,2);
  end loop;
  if p_coupon_code is not null then
    select * into coupon_row from public.coupons where upper(code)=upper(p_coupon_code) and active and starts_at<=now() and (expires_at is null or expires_at>now()) and (usage_limit is null or usage_count<usage_limit) for update;
    if not found then raise exception 'Coupon is invalid or expired'; end if;
    if subtotal_value < coupon_row.min_cart_value then raise exception 'Cart does not meet coupon minimum'; end if;
    if coupon_row.discount_type='percent' then discount_value := subtotal_value*coupon_row.discount_value/100; else discount_value := coupon_row.discount_value; end if;
    if coupon_row.max_discount is not null then discount_value := least(discount_value,coupon_row.max_discount); end if;
    discount_value := least(round(discount_value,2),subtotal_value);
  end if;
  total_value := greatest(0,subtotal_value-discount_value+tax_value+shipping_value);
  insert into public.orders(user_id,status,total,subtotal,discount_total,tax_total,shipping_total,shipping,currency,coupon_code,payment_status,idempotency_key)
  values(uid,'pending',total_value,subtotal_value,discount_value,tax_value,shipping_value,coalesce(p_shipping,'{}'),'INR',p_coupon_code,'pending',p_idempotency_key) returning id into order_id;
  for item in
    select jsonb_build_object('product_id', product_id, 'quantity', sum(quantity))
    from (select (value->>'product_id')::uuid as product_id, (value->>'quantity')::int as quantity
          from jsonb_array_elements(p_items)) as requested_items
    group by product_id order by product_id
  loop
    qty := (item->>'quantity')::int;
    select * into product_row from public.products where id=(item->>'product_id')::uuid;
    update public.inventory set reserved=reserved+qty, updated_at=now() where product_id=product_row.id;
    insert into public.order_items(order_id,product_id,quantity,unit_price,product_snapshot)
    values(order_id,product_row.id,qty,product_row.price,jsonb_build_object('name',product_row.name,'sku',product_row.sku,'image',product_row.image));
  end loop;
  insert into public.order_status_history(order_id,new_status,actor_id,note) values(order_id,'pending',uid,'Order placed');
  if p_coupon_code is not null then
    insert into public.coupon_redemptions(coupon_id,user_id,order_id,amount) values(coupon_row.id,uid,order_id,discount_value);
    update public.coupons set usage_count=usage_count+1 where id=coupon_row.id;
  end if;
  return jsonb_build_object('order_id',order_id,'total',total_value,'subtotal',subtotal_value,'tax',tax_value,'discount',discount_value,'status','pending');
end; $$;

create or replace function public.apply_razorpay_event(
  p_gateway_order_id text, p_payment_id text, p_outcome text, p_amount_minor int,
  p_currency text, p_event_id text, p_payload jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  payment_row public.payments%rowtype;
  order_row public.orders%rowtype;
  item_row public.order_items%rowtype;
  stock_row public.inventory%rowtype;
  new_status text;
begin
  if p_outcome not in ('captured','failed') or p_event_id is null or length(p_event_id)>200 or p_payment_id is null then raise exception 'Invalid payment event'; end if;
  select * into payment_row from public.payments where provider='razorpay' and provider_reference=p_gateway_order_id for update;
  if not found then raise exception 'Payment order not found'; end if;
  select * into order_row from public.orders where id=payment_row.order_id for update;
  if not found then raise exception 'Store order not found'; end if;
  if round(payment_row.amount*100)::int <> p_amount_minor or payment_row.currency<>p_currency then raise exception 'Payment amount or currency mismatch'; end if;
  insert into public.webhook_events(provider,event_id,payload) values('razorpay',p_event_id,coalesce(p_payload,'{}')) on conflict(provider,event_id) do nothing;
  if not found then return jsonb_build_object('duplicate',true,'order_id',order_row.id); end if;
  if p_outcome='captured' then
    if order_row.payment_status<>'paid' then
      update public.payments set status='paid',provider_payment_id=p_payment_id,raw_event=coalesce(p_payload,'{}'),updated_at=now() where id=payment_row.id;
      update public.orders set status='confirmed',payment_status='paid' where id=order_row.id;
      for item_row in select * from public.order_items where order_id=order_row.id order by product_id loop
        select * into stock_row from public.inventory where product_id=item_row.product_id for update;
        if not found or stock_row.reserved<item_row.quantity or stock_row.quantity<item_row.quantity then raise exception 'Reserved stock invariant failed'; end if;
        update public.inventory set quantity=quantity-item_row.quantity,reserved=reserved-item_row.quantity,updated_at=now() where product_id=item_row.product_id;
        insert into public.stock_movements(product_id,delta,reason,reference_id) values(item_row.product_id,-item_row.quantity,'payment_captured',order_row.id);
      end loop;
      insert into public.order_status_history(order_id,old_status,new_status,note) values(order_row.id,order_row.status,'confirmed','Payment captured');
    end if;
    new_status := 'paid';
  else
    update public.payments set status='failed',provider_payment_id=p_payment_id,raw_event=coalesce(p_payload,'{}'),updated_at=now() where id=payment_row.id and status<>'paid';
    if order_row.payment_status<>'paid' then
      if exists(select 1 from public.payments where order_id=order_row.id and status='pending' and id<>payment_row.id) then
        update public.orders set payment_status='pending' where id=order_row.id;
      else
        update public.orders set payment_status='failed' where id=order_row.id;
      end if;
    end if;
    new_status := 'failed';
  end if;
  update public.webhook_events set processed_at=now() where provider='razorpay' and event_id=p_event_id;
  return jsonb_build_object('duplicate',false,'order_id',order_row.id,'payment_status',new_status);
end; $$;
revoke all on function public.apply_razorpay_event(text,text,text,int,text,text,jsonb) from public, anon, authenticated;

create or replace function public.cancel_unpaid_order(p_order_id uuid, p_reason text default 'Payment setup failed') returns void
language plpgsql security definer set search_path=public as $$
declare
  order_row public.orders%rowtype;
  item_row public.order_items%rowtype;
  caller_role text := coalesce(current_setting('request.jwt.claim.role',true),'');
begin
  if auth.uid() is null and caller_role<>'service_role' then raise exception 'Sign in required'; end if;
  select * into order_row from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if order_row.user_id is distinct from auth.uid() and caller_role<>'service_role' then raise exception 'Not allowed'; end if;
  if order_row.payment_status='paid' then raise exception 'A paid order cannot be cancelled'; end if;
  if order_row.status='pending' then
    for item_row in select * from public.order_items where order_id=order_row.id order by product_id loop
      update public.inventory set reserved=greatest(0,reserved-item_row.quantity),updated_at=now() where product_id=item_row.product_id;
    end loop;
    update public.orders set status='cancelled',payment_status='failed' where id=order_row.id;
    insert into public.order_status_history(order_id,old_status,new_status,note,actor_id)
      values(order_row.id,order_row.status,'cancelled',left(p_reason,300),auth.uid());
  end if;
end; $$;
revoke all on function public.cancel_unpaid_order(uuid,text) from public, anon;

create or replace function public.admin_update_order_fulfillment(
  p_order_id uuid, p_status text, p_courier text default null, p_tracking_number text default null,
  p_tracking_url text default null, p_eta timestamptz default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  order_row public.orders%rowtype;
  shipment_row public.shipments%rowtype;
  item_row public.order_items%rowtype;
  valid_transition boolean := false;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_status not in ('confirmed','packed','shipped','out_for_delivery','delivered','cancelled') then raise exception 'Invalid fulfillment status'; end if;
  select * into order_row from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  select * into shipment_row from public.shipments where order_id=p_order_id;
  if p_status=order_row.status then
    valid_transition := true;
  elsif (order_row.status='pending' and p_status in ('confirmed','cancelled'))
     or (order_row.status='confirmed' and p_status in ('packed','cancelled'))
     or (order_row.status='packed' and p_status in ('shipped','cancelled'))
     or (order_row.status='shipped' and p_status='out_for_delivery')
     or (order_row.status='out_for_delivery' and p_status='delivered') then
    valid_transition := true;
  end if;
  if not valid_transition then raise exception 'Invalid order status transition'; end if;
  if p_status in ('confirmed','packed','shipped','out_for_delivery','delivered') and order_row.payment_status<>'paid' then
    raise exception 'Payment must be confirmed before fulfillment';
  end if;
  if p_status='shipped' and coalesce(nullif(trim(p_tracking_number),''),shipment_row.tracking_number) is null then
    raise exception 'A tracking number is required before shipping';
  end if;
  if p_status='cancelled' then
    if order_row.payment_status='paid' then raise exception 'Paid orders require a refund before cancellation'; end if;
    for item_row in select * from public.order_items where order_id=p_order_id order by product_id loop
      update public.inventory set reserved=greatest(0,reserved-item_row.quantity),updated_at=now() where product_id=item_row.product_id;
    end loop;
  end if;
  if p_status<>order_row.status then
    update public.orders set status=p_status, payment_status=case when p_status='cancelled' then 'failed' else payment_status end where id=p_order_id;
    insert into public.order_status_history(order_id,old_status,new_status,note,actor_id)
      values(p_order_id,order_row.status,p_status,'Fulfillment status updated by administrator',auth.uid());
    insert into public.notifications(user_id,kind,title,body,payload)
      values(order_row.user_id,'order_status','Order update',format('Your order #%s is now %s.',left(p_order_id::text,8),replace(p_status,'_',' ')),jsonb_build_object('orderId',p_order_id,'status',p_status));
    insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
      values(auth.uid(),'order.fulfillment.updated','order',p_order_id::text,jsonb_build_object('from',order_row.status,'to',p_status));
  end if;
  if p_courier is not null or p_tracking_number is not null or p_tracking_url is not null or p_eta is not null or p_status in ('shipped','out_for_delivery','delivered') then
    insert into public.shipments(order_id,courier,tracking_number,tracking_url,eta,shipped_at,delivered_at)
      values(p_order_id,nullif(trim(p_courier),''),nullif(trim(p_tracking_number),''),nullif(trim(p_tracking_url),''),p_eta,
        case when p_status='shipped' then now() else null end,case when p_status='delivered' then now() else null end)
    on conflict(order_id) do update set
      courier=coalesce(excluded.courier,public.shipments.courier),
      tracking_number=coalesce(excluded.tracking_number,public.shipments.tracking_number),
      tracking_url=coalesce(excluded.tracking_url,public.shipments.tracking_url),
      eta=coalesce(excluded.eta,public.shipments.eta),
      shipped_at=coalesce(public.shipments.shipped_at,excluded.shipped_at),
      delivered_at=coalesce(public.shipments.delivered_at,excluded.delivered_at),updated_at=now();
    if p_status=order_row.status then
      insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
        values(auth.uid(),'order.tracking.updated','order',p_order_id::text,jsonb_build_object('courier',p_courier,'trackingNumber',p_tracking_number,'trackingUrl',p_tracking_url,'eta',p_eta));
    end if;
  end if;
  return jsonb_build_object('order_id',p_order_id,'status',p_status);
end; $$;
revoke all on function public.admin_update_order_fulfillment(uuid,text,text,text,text,timestamptz) from public, anon;

create or replace function public.admin_save_product(
  p_product_id uuid, p_sku text, p_name text, p_category_id uuid, p_brand_id uuid,
  p_description text, p_price numeric, p_compare_at_price numeric, p_tax_rate numeric,
  p_status text, p_tags text[], p_specifications jsonb, p_image text,
  p_quantity int, p_low_stock_threshold int, p_stock_reason text, p_compatibility jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
declare
  product_key uuid := coalesce(p_product_id,gen_random_uuid());
  prior_quantity int := 0;
  reserved_quantity int := 0;
  had_inventory boolean := false;
  spec_row record;
  fitment_row jsonb;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_sku is null or length(trim(p_sku))<3 or length(p_sku)>60 or p_name is null or length(trim(p_name))<2 then raise exception 'Product SKU and name are required'; end if;
  if p_status is null or p_status not in ('draft','active','archived') or p_price is null or p_price<0 or (p_compare_at_price is not null and p_compare_at_price<p_price) or p_tax_rate is null or p_tax_rate<0 or p_tax_rate>100 then raise exception 'Invalid product price or status'; end if;
  if p_quantity is null or p_quantity<0 or p_low_stock_threshold is null or p_low_stock_threshold<0 or p_stock_reason is null or p_stock_reason not in ('restock','correction','damage','return','initial_stock') then raise exception 'Invalid inventory adjustment'; end if;
  if p_specifications is null or p_compatibility is null or jsonb_typeof(p_specifications)<>'object' or jsonb_object_length(p_specifications)>40 or jsonb_typeof(p_compatibility)<>'array' or jsonb_array_length(p_compatibility)>100 then raise exception 'Invalid specifications or fitment'; end if;
  if coalesce(cardinality(p_tags),0)>30 then raise exception 'A product can have up to 30 tags'; end if;
  if not exists(select 1 from public.categories where id=p_category_id and active) then raise exception 'Choose an active category'; end if;
  if p_brand_id is not null and not exists(select 1 from public.brands where id=p_brand_id and active) then raise exception 'Choose an active brand'; end if;
  if exists(select 1 from jsonb_array_elements(p_compatibility) as fits(item) where not exists(select 1 from public.vehicles v where v.id=(fits.item->>'vehicleId')::uuid)) then raise exception 'One or more fitment vehicles do not exist'; end if;

  if p_product_id is not null then
    perform 1 from public.products where id=p_product_id for update;
    if not found then raise exception 'Product not found'; end if;
    select quantity,reserved into prior_quantity,reserved_quantity from public.inventory where product_id=product_key for update;
    had_inventory := found;
    if p_quantity<coalesce(reserved_quantity,0) then raise exception 'Stock cannot be lower than currently reserved inventory'; end if;
    update public.products set sku=upper(trim(p_sku)),name=trim(p_name),category_id=p_category_id,brand_id=p_brand_id,
      description=coalesce(p_description,''),price=p_price,compare_at_price=p_compare_at_price,tax_rate=p_tax_rate,
      status=p_status,deleted_at=case when p_status='archived' then coalesce(deleted_at,now()) else null end,
      tags=coalesce(p_tags,'{}'),specifications=coalesce(p_specifications,'{}'),image=nullif(trim(p_image),''),
      in_stock=(p_quantity>coalesce(reserved_quantity,0)),updated_at=now() where id=product_key;
  else
    insert into public.products(id,sku,name,category_id,brand_id,description,price,compare_at_price,tax_rate,status,tags,specifications,image,in_stock)
      values(product_key,upper(trim(p_sku)),trim(p_name),p_category_id,p_brand_id,coalesce(p_description,''),p_price,p_compare_at_price,p_tax_rate,p_status,coalesce(p_tags,'{}'),coalesce(p_specifications,'{}'),nullif(trim(p_image),''),p_quantity>0);
  end if;

  if had_inventory then
    update public.inventory set quantity=p_quantity,low_stock_threshold=p_low_stock_threshold,updated_at=now() where product_id=product_key;
  else
    insert into public.inventory(product_id,quantity,low_stock_threshold) values(product_key,p_quantity,p_low_stock_threshold);
  end if;
  update public.products set in_stock=(p_quantity>coalesce(reserved_quantity,0)),updated_at=now() where id=product_key;
  if p_quantity<>prior_quantity then
    insert into public.stock_movements(product_id,actor_id,delta,reason,reference_id)
      values(product_key,auth.uid(),p_quantity-prior_quantity,'admin_'||p_stock_reason,product_key);
  end if;

  delete from public.product_specs ps where ps.product_id=product_key and not (p_specifications ? ps.name);
  for spec_row in select key,value from jsonb_each_text(p_specifications) loop
    insert into public.product_specs(product_id,name,value) values(product_key,spec_row.key,spec_row.value)
    on conflict(product_id,name) do update set value=excluded.value;
  end loop;
  delete from public.product_compatibility pc where pc.product_id=product_key and not exists(
    select 1 from jsonb_array_elements(p_compatibility) as fits(item) where (fits.item->>'vehicleId')::uuid=pc.vehicle_id
  );
  for fitment_row in select value from jsonb_array_elements(p_compatibility) loop
    insert into public.product_compatibility(product_id,vehicle_id,notes)
      values(product_key,(fitment_row->>'vehicleId')::uuid,coalesce(fitment_row->>'notes',''))
    on conflict(product_id,vehicle_id) do update set notes=excluded.notes;
  end loop;

  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
    values(auth.uid(),case when p_product_id is null then 'catalog.product.created' else 'catalog.product.updated' end,
      'product',product_key::text,jsonb_build_object('sku',upper(trim(p_sku)),'status',p_status,'stockReason',p_stock_reason));
  return product_key;
end; $$;
revoke all on function public.admin_save_product(uuid,text,text,uuid,uuid,text,numeric,numeric,numeric,text,text[],jsonb,text,int,int,text,jsonb) from public, anon;

create or replace function public.admin_archive_product(p_product_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  update public.products set status='archived',deleted_at=now(),updated_at=now() where id=p_product_id and deleted_at is null;
  if not found then raise exception 'Active product not found'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
    values(auth.uid(),'catalog.product.archived','product',p_product_id::text,'{}'::jsonb);
end; $$;
revoke all on function public.admin_archive_product(uuid) from public, anon;

create or replace function public.admin_save_category(
  p_category_id uuid, p_name text, p_description text, p_parent_id uuid,
  p_image_url text, p_active boolean, p_sort_order int
) returns uuid language plpgsql security definer set search_path=public as $$
declare
  category_key uuid := coalesce(p_category_id,gen_random_uuid());
  slug_value text := trim(both '-' from regexp_replace(lower(trim(p_name)),'[^a-z0-9]+','-','g'));
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_name is null or length(trim(p_name))<2 or length(p_name)>100 or p_description is null or length(p_description)>1000 then raise exception 'Invalid category name or description'; end if;
  if p_active is null or p_sort_order is null or p_sort_order<0 or p_sort_order>10000 then raise exception 'Invalid category state or order'; end if;
  if p_parent_id is not null and not exists(select 1 from public.categories where id=p_parent_id and active) then raise exception 'Choose an active parent category'; end if;
  if p_category_id is not null then
    perform 1 from public.categories where id=p_category_id for update;
    if not found then raise exception 'Category not found'; end if;
    if p_parent_id is not null and exists(
      with recursive subtree(id) as (
        select p_category_id union select c.id from public.categories c join subtree s on c.parent_id=s.id
      ) select 1 from subtree where id=p_parent_id
    ) then raise exception 'Category hierarchy cannot contain a cycle'; end if;
    update public.categories set name=trim(p_name),slug=slug_value,description=trim(p_description),parent_id=p_parent_id,
      image_url=nullif(trim(p_image_url),''),active=p_active,sort_order=p_sort_order where id=category_key;
  else
    insert into public.categories(id,name,slug,description,parent_id,image_url,active,sort_order)
      values(category_key,trim(p_name),slug_value,trim(p_description),p_parent_id,nullif(trim(p_image_url),''),p_active,p_sort_order);
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
    values(auth.uid(),case when p_category_id is null then 'catalog.category.created' else 'catalog.category.updated' end,
      'category',category_key::text,jsonb_build_object('name',trim(p_name),'active',p_active,'sortOrder',p_sort_order,'parentId',p_parent_id));
  return category_key;
end; $$;
revoke all on function public.admin_save_category(uuid,text,text,uuid,text,boolean,int) from public, anon;

create or replace function public.admin_archive_category(p_category_id uuid, p_reassign_to uuid default null) returns void language plpgsql security definer set search_path=public as $$
declare
  category_row public.categories%rowtype;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  select * into category_row from public.categories where id=p_category_id for update;
  if not found then raise exception 'Category not found'; end if;
  if p_reassign_to=p_category_id then raise exception 'Choose a different category for reassignment'; end if;
  if p_reassign_to is not null then
    if not exists(select 1 from public.categories where id=p_reassign_to and active) then raise exception 'Choose an active reassignment category'; end if;
    if exists(
      with recursive subtree(id) as (
        select p_category_id union select c.id from public.categories c join subtree s on c.parent_id=s.id
      ) select 1 from subtree where id=p_reassign_to
    ) then raise exception 'Category reassignment would create a cycle'; end if;
    update public.products set category_id=p_reassign_to,updated_at=now() where category_id=p_category_id;
    update public.categories set parent_id=p_reassign_to where parent_id=p_category_id;
  elsif exists(select 1 from public.products where category_id=p_category_id) or exists(select 1 from public.categories where parent_id=p_category_id) then
    raise exception 'Category contains products or child categories; choose a reassignment category';
  end if;
  update public.categories set active=false where id=p_category_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
    values(auth.uid(),'catalog.category.archived','category',p_category_id::text,jsonb_build_object('reassignedTo',p_reassign_to));
end; $$;
revoke all on function public.admin_archive_category(uuid,uuid) from public, anon;

create or replace function public.sync_customer_cart(p_items jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  customer_id uuid := auth.uid();
  customer_cart_id uuid;
  item jsonb;
  qty int;
  product_key uuid;
begin
  if customer_id is null then raise exception 'Sign in required'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)>100 then raise exception 'Invalid cart'; end if;
  insert into public.carts(user_id) values(customer_id)
  on conflict(user_id) where user_id is not null do update set updated_at=now()
  returning id into customer_cart_id;
  delete from public.cart_items where cart_id=customer_cart_id;
  for item in
    select jsonb_build_object('product_id',product_id,'quantity',sum(quantity))
    from (select (value->>'productId')::uuid as product_id,(value->>'quantity')::int as quantity from jsonb_array_elements(p_items)) requested
    group by product_id order by product_id
  loop
    product_key := (item->>'product_id')::uuid;
    qty := (item->>'quantity')::int;
    if qty is null or qty<1 or qty>50 then raise exception 'Invalid cart quantity'; end if;
    if not exists(select 1 from public.products p where p.id=product_key and p.status='active' and p.deleted_at is null) then
      raise exception 'Product is unavailable';
    end if;
    insert into public.cart_items(cart_id,product_id,quantity) values(customer_cart_id,product_key,qty);
  end loop;
  update public.carts set updated_at=now() where id=customer_cart_id;
  return jsonb_build_object('items',coalesce((
    select jsonb_agg(jsonb_build_object('productId',product_id,'quantity',quantity) order by created_at)
    from public.cart_items where cart_id=customer_cart_id
  ),'[]'::jsonb));
end; $$;

-- The base schema already defines is_admin(); leave that trusted function unchanged.
create or replace function public.protect_profile_role() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.role is distinct from old.role
    and coalesce(current_setting('role', true), '') <> 'service_role'
    and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
    and not public.is_admin() then
    raise exception 'Only an administrator can change account roles';
  end if;
  return new;
end; $$;
drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update of role on public.profiles for each row execute function public.protect_profile_role();

-- Private commerce data is scoped to its owner. Admin access uses the existing role profile.
do $$ declare t text; begin
  foreach t in array array['addresses','carts','cart_items','wishlists','inventory','stock_movements','order_status_history','shipments','payments','webhook_events','refunds','coupon_redemptions','reviews','review_votes','notifications','support_tickets','audit_logs','search_queries','user_events','product_images','product_specs','brands'] loop
    execute format('alter table public.%I enable row level security',t);
  end loop;
end $$;
drop policy if exists "public catalog read" on public.products;
create policy products_public_active_read on public.products for select using (status='active' and deleted_at is null);
drop policy if exists "admin product write" on public.products;
create policy products_admin_manage on public.products for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "profiles own row" on public.profiles;
create policy profiles_owner_read on public.profiles for select using (id=auth.uid() or public.is_admin());
create policy profiles_owner_update on public.profiles for update using (id=auth.uid() or public.is_admin()) with check (id=auth.uid() or public.is_admin());
create policy profiles_admin_insert on public.profiles for insert with check (public.is_admin());
drop policy if exists "public category read" on public.categories;
create policy categories_public_active_read on public.categories for select using (active);
drop policy if exists "admin category write" on public.categories;
create policy categories_admin_manage on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy brands_public_active_read on public.brands for select using(active);
create policy brands_admin_manage on public.brands for all using(public.is_admin()) with check(public.is_admin());
create policy product_images_public_read on public.product_images for select using(exists(select 1 from public.products p where p.id=product_id and p.status='active' and p.deleted_at is null));
create policy product_images_admin_manage on public.product_images for all using(public.is_admin()) with check(public.is_admin());
create policy product_specs_public_read on public.product_specs for select using(exists(select 1 from public.products p where p.id=product_id and p.status='active' and p.deleted_at is null));
create policy product_specs_admin_manage on public.product_specs for all using(public.is_admin()) with check(public.is_admin());
create policy addresses_owner_manage on public.addresses for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy carts_owner_read on public.carts for select using(user_id=auth.uid());
create policy carts_owner_manage on public.carts for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy cart_items_owner_manage on public.cart_items for all using(exists(select 1 from public.carts c where c.id=cart_id and c.user_id=auth.uid())) with check(exists(select 1 from public.carts c where c.id=cart_id and c.user_id=auth.uid()));
create policy wishlists_owner_manage on public.wishlists for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy inventory_admin_manage on public.inventory for all using(public.is_admin()) with check(public.is_admin());
create policy stock_movements_admin_read on public.stock_movements for select using(public.is_admin());
create policy orders_admin_read_commerce on public.orders for select using(public.is_admin());
create policy orders_admin_update_commerce on public.orders for update using(public.is_admin()) with check(public.is_admin());
create policy order_items_admin_read on public.order_items for select using(public.is_admin());
create policy order_status_owner_read on public.order_status_history for select using(exists(select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or public.is_admin())));
create policy shipment_owner_read on public.shipments for select using(exists(select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or public.is_admin())));
create policy shipment_admin_manage on public.shipments for all using(public.is_admin()) with check(public.is_admin());
create policy payments_admin_manage on public.payments for all using(public.is_admin()) with check(public.is_admin());
create policy webhook_events_admin_read on public.webhook_events for select using(public.is_admin());
create policy refunds_admin_manage on public.refunds for all using(public.is_admin()) with check(public.is_admin());
create policy coupons_admin_manage on public.coupons for all using(public.is_admin()) with check(public.is_admin());
create policy coupon_redemptions_owner_read on public.coupon_redemptions for select using(user_id=auth.uid() or public.is_admin());
create policy reviews_public_approved_read on public.reviews for select using(status='approved' or user_id=auth.uid() or public.is_admin());
create policy reviews_owner_insert on public.reviews for insert with check(user_id=auth.uid());
create policy reviews_owner_update on public.reviews for update using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy reviews_admin_manage on public.reviews for all using(public.is_admin()) with check(public.is_admin());
create policy review_votes_owner_manage on public.review_votes for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy notifications_owner_manage on public.notifications for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy tickets_owner_read on public.support_tickets for select using(user_id=auth.uid() or public.is_admin());
create policy tickets_owner_insert on public.support_tickets for insert with check(user_id=auth.uid());
create policy tickets_admin_manage on public.support_tickets for all using(public.is_admin()) with check(public.is_admin());
create policy audit_logs_admin_read on public.audit_logs for select using(public.is_admin());
create policy audit_logs_admin_insert on public.audit_logs for insert with check(public.is_admin());
create policy search_queries_owner_read on public.search_queries for select using(user_id=auth.uid() or public.is_admin());
create policy user_events_owner_manage on public.user_events for all using(user_id=auth.uid()) with check(user_id=auth.uid());
grant execute on function public.place_order(jsonb,jsonb,text,text) to authenticated;
grant execute on function public.sync_customer_cart(jsonb) to authenticated;
grant execute on function public.apply_razorpay_event(text,text,text,int,text,text,jsonb) to service_role;
grant execute on function public.cancel_unpaid_order(uuid,text) to authenticated, service_role;
grant execute on function public.admin_update_order_fulfillment(uuid,text,text,text,text,timestamptz) to authenticated;
grant execute on function public.admin_save_product(uuid,text,text,uuid,uuid,text,numeric,numeric,numeric,text,text[],jsonb,text,int,int,text,jsonb) to authenticated;
grant execute on function public.admin_archive_product(uuid) to authenticated;
grant execute on function public.admin_save_category(uuid,text,text,uuid,text,boolean,int) to authenticated;
grant execute on function public.admin_archive_category(uuid,uuid) to authenticated;
