create table if not exists public.product_bundles (
  id uuid primary key default gen_random_uuid(),
  title text not null check(length(title) between 3 and 140),
  description text not null default '',
  discount_percent numeric(5,2) not null default 0 check(discount_percent between 0 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.bundle_items (
  bundle_id uuid not null references public.product_bundles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity int not null default 1 check(quantity between 1 and 50),
  primary key(bundle_id, product_id)
);
alter table public.product_bundles enable row level security;
alter table public.bundle_items enable row level security;
create policy product_bundles_public_read on public.product_bundles for select using(active);
create policy product_bundles_admin_manage on public.product_bundles for all using(public.is_admin()) with check(public.is_admin());
create policy bundle_items_public_read on public.bundle_items for select using(exists(select 1 from public.product_bundles b join public.products p on p.id=product_id where b.id=bundle_id and b.active and p.status='active' and p.deleted_at is null));
create policy bundle_items_admin_manage on public.bundle_items for all using(public.is_admin()) with check(public.is_admin());

insert into public.product_bundles(id,title,description,discount_percent,active)
select 'd16f9988-616a-4de4-8c0a-2a50ba85ac10','EcoSport cabin protection','A practical interior set for the India-market Ford EcoSport. Verify exact year and fitment before purchase.',0,true
where exists(select 1 from public.products where sku='MMR-FORD-001')
on conflict(id) do nothing;
insert into public.bundle_items(bundle_id,product_id,quantity)
select 'd16f9988-616a-4de4-8c0a-2a50ba85ac10',id,1 from public.products where sku in ('MMR-FORD-001','MMR-FORD-004')
on conflict(bundle_id,product_id) do nothing;
