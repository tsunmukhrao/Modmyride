-- Stable product options with server-owned price and stock; preserve old non-variant lines.
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  options jsonb not null default '{}',
  price numeric(12,2) not null check (price >= 0),
  quantity int not null default 0 check (quantity >= 0),
  reserved int not null default 0 check (reserved >= 0 and reserved <= quantity),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists product_variants_product_active_idx on public.product_variants(product_id, active);
alter table public.product_variants enable row level security;
create policy product_variants_public_read on public.product_variants for select using(active and exists(select 1 from public.products p where p.id=product_id and p.status='active' and p.deleted_at is null));
create policy product_variants_admin_manage on public.product_variants for all using(public.is_admin()) with check(public.is_admin());

alter table public.cart_items add column if not exists variant_id uuid references public.product_variants(id) on delete restrict;
alter table public.cart_items drop constraint if exists cart_items_pkey;
alter table public.cart_items add column if not exists line_id uuid not null default gen_random_uuid();
alter table public.cart_items add constraint cart_items_pkey primary key(line_id);
create unique index if not exists cart_items_product_no_variant_uidx on public.cart_items(cart_id, product_id) where variant_id is null;
create unique index if not exists cart_items_variant_uidx on public.cart_items(cart_id, product_id, variant_id) where variant_id is not null;

alter table public.order_items add column if not exists variant_id uuid references public.product_variants(id) on delete set null;
alter table public.order_items drop constraint if exists order_items_pkey;
alter table public.order_items add column if not exists line_id uuid not null default gen_random_uuid();
alter table public.order_items add constraint order_items_pkey primary key(line_id);
create unique index if not exists order_items_product_no_variant_uidx on public.order_items(order_id, product_id) where variant_id is null;
create unique index if not exists order_items_variant_uidx on public.order_items(order_id, product_id, variant_id) where variant_id is not null;

create or replace function public.sync_customer_cart(p_items jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare customer_id uuid := auth.uid(); customer_cart_id uuid; item jsonb; qty int; product_key uuid; variant_key uuid;
begin
  if customer_id is null then raise exception 'Sign in required'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>100 then raise exception 'Invalid cart'; end if;
  insert into public.carts(user_id) values(customer_id)
    on conflict(user_id) where user_id is not null do update set updated_at=now() returning id into customer_cart_id;
  delete from public.cart_items where cart_id=customer_cart_id;
  for item in
    select jsonb_build_object('product_id',product_id,'variant_id',variant_id,'quantity',sum(quantity))
    from (select (value->>'productId')::uuid product_id,nullif(value->>'variantId','')::uuid variant_id,(value->>'quantity')::int quantity from jsonb_array_elements(p_items)) requested
    group by product_id,variant_id order by product_id,variant_id
  loop
    product_key := (item->>'product_id')::uuid;
    variant_key := nullif(item->>'variant_id','')::uuid;
    qty := (item->>'quantity')::int;
    if qty is null or qty<1 or qty>50 then raise exception 'Invalid cart quantity'; end if;
    if not exists(select 1 from public.products p where p.id=product_key and p.status='active' and p.deleted_at is null) then raise exception 'Product is unavailable'; end if;
    if variant_key is not null and not exists(select 1 from public.product_variants v where v.id=variant_key and v.product_id=product_key and v.active) then raise exception 'Product option is unavailable'; end if;
    insert into public.cart_items(cart_id,product_id,variant_id,quantity) values(customer_cart_id,product_key,variant_key,qty);
  end loop;
  update public.carts set updated_at=now() where id=customer_cart_id;
  return jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object('productId',product_id,'variantId',variant_id,'quantity',quantity) order by created_at) from public.cart_items where cart_id=customer_cart_id),'[]'::jsonb));
end; $$;
grant execute on function public.sync_customer_cart(jsonb) to authenticated;

create or replace function public.place_order(p_items jsonb,p_shipping jsonb,p_idempotency_key text,p_coupon_code text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  uid uuid := auth.uid(); item jsonb; product_row public.products%rowtype; stock_row public.inventory%rowtype; variant_row public.product_variants%rowtype;
  order_id uuid; subtotal_value numeric(12,2):=0; tax_value numeric(12,2):=0; discount_value numeric(12,2):=0; shipping_value numeric(12,2):=0; total_value numeric(12,2);
  qty int; selected_variant_id uuid; price_value numeric(12,2); coupon_row public.coupons%rowtype; postal_code text;
begin
  if uid is null then raise exception 'Sign in required'; end if;
  if p_idempotency_key is null or length(p_idempotency_key)<8 then raise exception 'Valid idempotency key required'; end if;
  select id into order_id from public.orders where user_id=uid and idempotency_key=p_idempotency_key;
  if order_id is not null then return jsonb_build_object('order_id',order_id,'status','existing'); end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Cart is empty'; end if;
  postal_code := p_shipping->>'postalCode';
  if postal_code !~ '^[1-9][0-9]{5}$' then raise exception 'A valid six-digit Indian postal code is required'; end if;
  shipping_value := case left(postal_code,1) when '1' then 99 when '2' then 99 when '3' then 149 when '4' then 149 when '5' then 149 when '6' then 149 when '7' then 199 else 249 end;
  for item in
    select jsonb_build_object('product_id',product_id,'variant_id',variant_id,'quantity',sum(quantity))
    from (select (value->>'product_id')::uuid product_id,nullif(value->>'variant_id','')::uuid variant_id,(value->>'quantity')::int quantity from jsonb_array_elements(p_items)) requested
    group by product_id,variant_id order by product_id,variant_id
  loop
    qty := (item->>'quantity')::int; selected_variant_id := nullif(item->>'variant_id','')::uuid;
    if qty is null or qty<1 or qty>50 then raise exception 'Invalid quantity'; end if;
    select * into product_row from public.products where id=(item->>'product_id')::uuid and status='active' and deleted_at is null for share;
    if not found then raise exception 'Product is unavailable'; end if;
    if selected_variant_id is null then
      select * into stock_row from public.inventory where product_id=product_row.id for update;
      if not found or stock_row.quantity-stock_row.reserved<qty then raise exception 'Insufficient stock for %',product_row.name; end if;
      price_value := product_row.price;
    else
      select * into variant_row from public.product_variants where id=selected_variant_id and product_id=product_row.id and active for update;
      if not found then raise exception 'Product option is unavailable'; end if;
      if variant_row.quantity-variant_row.reserved<qty then raise exception 'Insufficient stock for %',variant_row.sku; end if;
      price_value := variant_row.price;
    end if;
    subtotal_value := subtotal_value+price_value*qty;
    tax_value := tax_value+round(price_value*qty*product_row.tax_rate/100,2);
  end loop;
  if p_coupon_code is not null then
    select * into coupon_row from public.coupons where upper(code)=upper(p_coupon_code) and active and starts_at<=now() and (expires_at is null or expires_at>now()) and (usage_limit is null or usage_count<usage_limit) for update;
    if not found then raise exception 'Coupon is invalid or expired'; end if;
    if subtotal_value<coupon_row.min_cart_value then raise exception 'Cart does not meet coupon minimum'; end if;
    if coupon_row.discount_type='percent' then discount_value:=subtotal_value*coupon_row.discount_value/100; else discount_value:=coupon_row.discount_value; end if;
    if coupon_row.max_discount is not null then discount_value:=least(discount_value,coupon_row.max_discount); end if;
    discount_value:=least(round(discount_value,2),subtotal_value);
  end if;
  total_value:=greatest(0,subtotal_value-discount_value+tax_value+shipping_value);
  insert into public.orders(user_id,status,total,subtotal,discount_total,tax_total,shipping_total,shipping,currency,coupon_code,payment_status,idempotency_key)
    values(uid,'pending',total_value,subtotal_value,discount_value,tax_value,shipping_value,coalesce(p_shipping,'{}'),'INR',p_coupon_code,'pending',p_idempotency_key) returning id into order_id;
  for item in
    select jsonb_build_object('product_id',product_id,'variant_id',variant_id,'quantity',sum(quantity))
    from (select (value->>'product_id')::uuid product_id,nullif(value->>'variant_id','')::uuid variant_id,(value->>'quantity')::int quantity from jsonb_array_elements(p_items)) requested
    group by product_id,variant_id order by product_id,variant_id
  loop
    qty:=(item->>'quantity')::int; selected_variant_id:=nullif(item->>'variant_id','')::uuid;
    select * into product_row from public.products where id=(item->>'product_id')::uuid;
    if selected_variant_id is null then
      update public.inventory set reserved=reserved+qty,updated_at=now() where product_id=product_row.id;
      price_value:=product_row.price;
      insert into public.order_items(order_id,product_id,quantity,unit_price,product_snapshot)
        values(order_id,product_row.id,qty,price_value,jsonb_build_object('name',product_row.name,'sku',product_row.sku,'image',product_row.image));
    else
      select * into variant_row from public.product_variants where id=selected_variant_id;
      update public.product_variants set reserved=reserved+qty,updated_at=now() where id=selected_variant_id;
      price_value:=variant_row.price;
      insert into public.order_items(order_id,product_id,variant_id,quantity,unit_price,product_snapshot)
        values(order_id,product_row.id,selected_variant_id,qty,price_value,jsonb_build_object('name',product_row.name,'sku',variant_row.sku,'image',product_row.image,'options',variant_row.options));
    end if;
  end loop;
  insert into public.order_status_history(order_id,new_status,actor_id,note) values(order_id,'pending',uid,'Order placed');
  if p_coupon_code is not null then
    insert into public.coupon_redemptions(coupon_id,user_id,order_id,amount) values(coupon_row.id,uid,order_id,discount_value);
    update public.coupons set usage_count=usage_count+1 where id=coupon_row.id;
  end if;
  return jsonb_build_object('order_id',order_id,'total',total_value,'subtotal',subtotal_value,'discount',discount_value,'tax',tax_value,'shipping',shipping_value,'status','pending');
end; $$;
revoke all on function public.place_order(jsonb,jsonb,text,text) from public,anon;
grant execute on function public.place_order(jsonb,jsonb,text,text) to authenticated;

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
      if item_row.variant_id is not null then
        update public.product_variants set reserved=greatest(0,reserved-item_row.quantity),updated_at=now() where id=item_row.variant_id;
      else
        update public.inventory set reserved=greatest(0,reserved-item_row.quantity),updated_at=now() where product_id=item_row.product_id;
      end if;
    end loop;
    update public.orders set status='cancelled',payment_status='failed' where id=order_row.id;
    insert into public.order_status_history(order_id,old_status,new_status,note,actor_id)
      values(order_row.id,order_row.status,'cancelled',left(p_reason,300),auth.uid());
  end if;
end; $$;
revoke all on function public.cancel_unpaid_order(uuid,text) from public,anon;
grant execute on function public.cancel_unpaid_order(uuid,text) to authenticated,service_role;

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
  if not public.is_admin() and coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Administrator access required'; end if;
  if p_status not in ('confirmed','packed','shipped','out_for_delivery','delivered','cancelled') then raise exception 'Invalid fulfillment status'; end if;
  select * into order_row from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  select * into shipment_row from public.shipments where order_id=p_order_id;
  if p_status=order_row.status then valid_transition:=true;
  elsif (order_row.status='pending' and p_status in ('confirmed','cancelled'))
     or (order_row.status='confirmed' and p_status in ('packed','cancelled'))
     or (order_row.status='packed' and p_status in ('shipped','cancelled'))
     or (order_row.status='shipped' and p_status='out_for_delivery')
     or (order_row.status='out_for_delivery' and p_status='delivered') then valid_transition:=true;
  end if;
  if not valid_transition then raise exception 'Invalid order status transition'; end if;
  if p_status in ('confirmed','packed','shipped','out_for_delivery','delivered') and order_row.payment_status<>'paid' then raise exception 'Payment must be confirmed before fulfillment'; end if;
  if p_status='shipped' and coalesce(nullif(trim(p_tracking_number),''),shipment_row.tracking_number) is null then raise exception 'A tracking number is required before shipping'; end if;
  if p_status='cancelled' then
    if order_row.payment_status='paid' then raise exception 'Paid orders require a refund before cancellation'; end if;
    for item_row in select * from public.order_items where order_id=p_order_id order by product_id loop
      if item_row.variant_id is not null then update public.product_variants set reserved=greatest(0,reserved-item_row.quantity),updated_at=now() where id=item_row.variant_id;
      else update public.inventory set reserved=greatest(0,reserved-item_row.quantity),updated_at=now() where product_id=item_row.product_id; end if;
    end loop;
  end if;
  if p_status<>order_row.status then
    update public.orders set status=p_status,payment_status=case when p_status='cancelled' then 'failed' else payment_status end where id=p_order_id;
    insert into public.order_status_history(order_id,old_status,new_status,note,actor_id) values(p_order_id,order_row.status,p_status,'Fulfillment status updated by administrator',auth.uid());
    insert into public.notifications(user_id,kind,title,body,payload) values(order_row.user_id,'order_status','Order update',format('Your order #%s is now %s.',left(p_order_id::text,8),replace(p_status,'_',' ')),jsonb_build_object('orderId',p_order_id,'status',p_status));
    insert into public.audit_logs(actor_id,action,entity_type,entity_id,details) values(auth.uid(),'order.fulfillment.updated','order',p_order_id::text,jsonb_build_object('from',order_row.status,'to',p_status));
  end if;
  if p_courier is not null or p_tracking_number is not null or p_tracking_url is not null or p_eta is not null or p_status in ('shipped','out_for_delivery','delivered') then
    insert into public.shipments(order_id,courier,tracking_number,tracking_url,eta,shipped_at,delivered_at)
      values(p_order_id,nullif(trim(p_courier),''),nullif(trim(p_tracking_number),''),nullif(trim(p_tracking_url),''),p_eta,case when p_status='shipped' then now() else null end,case when p_status='delivered' then now() else null end)
    on conflict(order_id) do update set courier=coalesce(excluded.courier,shipments.courier),tracking_number=coalesce(excluded.tracking_number,shipments.tracking_number),tracking_url=coalesce(excluded.tracking_url,shipments.tracking_url),eta=coalesce(excluded.eta,shipments.eta),shipped_at=coalesce(excluded.shipped_at,shipments.shipped_at),delivered_at=coalesce(excluded.delivered_at,shipments.delivered_at),updated_at=now();
  end if;
  return jsonb_build_object('id',p_order_id,'status',p_status,'payment_status',case when p_status='cancelled' then 'failed' else order_row.payment_status end);
end; $$;
grant execute on function public.admin_update_order_fulfillment(uuid,text,text,text,text,timestamptz) to authenticated;

-- Demo options for the Ford EcoSport mat product; replace these sample records with verified fitments.
insert into public.product_variants(product_id,sku,options,price,quantity)
select p.id,'MMR-FORD-001-2013-17','{"vehicle_year":"2013–2017"}'::jsonb,p.price,20 from public.products p where p.sku='MMR-FORD-001'
on conflict(sku) do nothing;
insert into public.product_variants(product_id,sku,options,price,quantity)
select p.id,'MMR-FORD-001-2018-21','{"vehicle_year":"2018–2021"}'::jsonb,p.price,20 from public.products p where p.sku='MMR-FORD-001'
on conflict(sku) do nothing;
