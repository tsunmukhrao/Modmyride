-- Base schema mirrored from schema.sql so Supabase CLI resets create the full app schema.
create extension if not exists pgcrypto;

create table if not exists profiles (id uuid primary key references auth.users(id) on delete cascade, full_name text not null default '', role text not null default 'customer' check (role in ('customer','admin')), vehicle_make text, vehicle_model text, vehicle_year int, created_at timestamptz not null default now());
create table if not exists vehicles (id uuid primary key default gen_random_uuid(), make text not null, model text not null, year_from int, year_to int, trim text, unique(make, model, year_from, year_to, trim));
create table if not exists categories (id uuid primary key default gen_random_uuid(), name text unique not null, description text not null default '');
create table if not exists products (id uuid primary key default gen_random_uuid(), sku text unique not null, name text not null, category_id uuid references categories(id), description text not null default '', price numeric(12,2) not null check (price >= 0), image text, tags text[] not null default '{}', in_stock boolean not null default true, search_vector tsvector generated always as (to_tsvector('simple', coalesce(sku,'') || ' ' || coalesce(name,'') || ' ' || coalesce(description,''))) stored, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index if not exists products_search_idx on products using gin(search_vector);
create table if not exists product_compatibility (product_id uuid references products(id) on delete cascade, vehicle_id uuid references vehicles(id) on delete cascade, notes text not null default '', primary key(product_id, vehicle_id));
create table if not exists orders (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), status text not null default 'pending' check (status in ('pending','confirmed','fulfilled','cancelled')), total numeric(12,2) not null check (total >= 0), shipping jsonb not null default '{}', created_at timestamptz not null default now());
create table if not exists order_items (order_id uuid references orders(id) on delete cascade, product_id uuid references products(id), quantity int not null check (quantity > 0), unit_price numeric(12,2) not null check (unit_price >= 0), primary key(order_id, product_id));
create table if not exists ai_conversations (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, created_at timestamptz not null default now());
create table if not exists ai_messages (id uuid primary key default gen_random_uuid(), conversation_id uuid references ai_conversations(id) on delete cascade, role text not null check (role in ('user','assistant')), content text not null, sources jsonb not null default '[]', created_at timestamptz not null default now());

create or replace function is_admin() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin'); $$;
insert into storage.buckets (id, name, public) values ('product-media', 'product-media', true) on conflict (id) do nothing;
create policy "public product media read" on storage.objects for select using (bucket_id = 'product-media');
create policy "admin product media write" on storage.objects for all using (bucket_id = 'product-media' and is_admin()) with check (bucket_id = 'product-media' and is_admin());
alter table profiles enable row level security; alter table orders enable row level security; alter table order_items enable row level security; alter table ai_conversations enable row level security; alter table ai_messages enable row level security;
alter table products enable row level security; alter table categories enable row level security; alter table vehicles enable row level security; alter table product_compatibility enable row level security;
create policy "profiles own row" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "public catalog read" on products for select using (true);
create policy "public category read" on categories for select using (true);
create policy "public vehicle read" on vehicles for select using (true);
create policy "public compatibility read" on product_compatibility for select using (true);
create policy "admin product write" on products for all using (is_admin()) with check (is_admin());
create policy "admin category write" on categories for all using (is_admin()) with check (is_admin());
create policy "admin vehicle write" on vehicles for all using (is_admin()) with check (is_admin());
create policy "admin compatibility write" on product_compatibility for all using (is_admin()) with check (is_admin());
create policy "admin order read" on orders for select using (is_admin());
create policy "admin order update" on orders for update using (is_admin()) with check (is_admin());
create policy "orders own rows" on orders for select using (auth.uid() = user_id);
create policy "order items own rows" on order_items for select using (exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid()));
create policy "conversations own rows" on ai_conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "messages in own conversations" on ai_messages for all using (exists (select 1 from ai_conversations where ai_conversations.id = ai_messages.conversation_id and ai_conversations.user_id = auth.uid()));
