-- Rollback for 202611040001_commerce_search.sql. Existing products/orders and base schema remain intact.
drop function if exists public.place_order(jsonb,jsonb,text,text);
drop function if exists public.sync_customer_cart(jsonb);
drop function if exists public.apply_razorpay_event(text,text,text,int,text,text,jsonb);
drop function if exists public.cancel_unpaid_order(uuid,text);
drop function if exists public.admin_update_order_fulfillment(uuid,text,text,text,text,timestamptz);
drop function if exists public.admin_save_product(uuid,text,text,uuid,uuid,text,numeric,numeric,numeric,text,text[],jsonb,text,int,int,text,jsonb);
drop function if exists public.admin_archive_product(uuid);
drop function if exists public.admin_save_category(uuid,text,text,uuid,text,boolean,int);
drop function if exists public.admin_archive_category(uuid,uuid);
drop trigger if exists verified_review_guard on public.reviews;
drop trigger if exists profiles_protect_role on public.profiles;
drop trigger if exists on_auth_user_created_profile on auth.users;
drop function if exists public.enforce_verified_review();
drop function if exists public.protect_profile_role();
drop function if exists public.create_profile_for_new_auth_user();
drop policy if exists products_public_active_read on public.products;
drop policy if exists products_admin_manage on public.products;
drop policy if exists categories_public_active_read on public.categories;
drop policy if exists categories_admin_manage on public.categories;
drop policy if exists profiles_owner_read on public.profiles;
drop policy if exists profiles_owner_update on public.profiles;
drop policy if exists profiles_admin_insert on public.profiles;
drop policy if exists audit_logs_admin_insert on public.audit_logs;
create policy "profiles own row" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "public catalog read" on public.products for select using (true);
create policy "admin product write" on public.products for all using (is_admin()) with check (is_admin());
create policy "public category read" on public.categories for select using (true);
create policy "admin category write" on public.categories for all using (is_admin()) with check (is_admin());
drop table if exists
  public.user_events, public.search_queries, public.audit_logs, public.support_tickets, public.notifications, public.review_votes,
  public.reviews, public.coupon_redemptions, public.coupons, public.refunds, public.webhook_events, public.payments, public.shipments,
  public.order_status_history, public.wishlists, public.cart_items, public.carts, public.stock_movements, public.inventory,
  public.addresses, public.product_specs, public.product_images, public.brands cascade;
alter table public.products drop column if exists brand_id, drop column if exists compare_at_price, drop column if exists tax_rate,
  drop column if exists specifications, drop column if exists status, drop column if exists deleted_at, drop column if exists popularity;
alter table public.categories drop column if exists slug, drop column if exists parent_id, drop column if exists active, drop column if exists sort_order, drop column if exists image_url;
alter table public.profiles drop column if exists phone, drop column if exists updated_at;
alter table public.vehicles drop column if exists body_type, drop column if exists generation, drop column if exists source, drop column if exists source_key;
alter table public.order_items drop column if exists product_snapshot;
alter table public.orders drop column if exists subtotal, drop column if exists discount_total, drop column if exists tax_total,
  drop column if exists shipping_total, drop column if exists currency, drop column if exists coupon_code,
  drop column if exists payment_status, drop column if exists idempotency_key;
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check(status in ('pending','confirmed','fulfilled','cancelled'));
