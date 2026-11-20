create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 160),
  contact_name text not null default '',
  email text not null default '',
  phone text not null default '',
  website text not null default '',
  notes text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists suppliers_active_name_idx on public.suppliers (active, name);
create or replace function public.set_supplier_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists suppliers_set_updated_at on public.suppliers;
create trigger suppliers_set_updated_at before update on public.suppliers
for each row execute function public.set_supplier_updated_at();
alter table public.suppliers enable row level security;
drop policy if exists suppliers_admin_manage on public.suppliers;
create policy suppliers_admin_manage on public.suppliers for all using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.suppliers to service_role;
