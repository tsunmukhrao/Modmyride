-- Curate the imported catalog to 25 vehicle-specific products and seed sample stock
-- for checkout testing. This migration runs once; subsequent stock edits are admin-owned.
begin;

update public.products
set status = 'archived', updated_at = now()
where sku ~ '^MMR-AF-(10[1-9]|1[1-3][0-9])$';

update public.products
set source_url = null,
    tags = array_remove(tags, 'Autofurnish'),
    updated_at = now()
where sku ~ '^MMR-AF-(10[1-9]|1[1-3][0-9])$';

update public.products
set status = 'archived', updated_at = now()
where sku ~ '^MMR-FORD-00[1-5]$';

update public.products
set status = 'archived', updated_at = now()
where sku ~ '^MMR-(INT|EXT|LGT|WHL|TEC|SAF|CARE|PERF)-[0-9]+$';

with sample_stock(sku, quantity) as (values
  ('MMR-AF-140', 12), ('MMR-AF-141', 8), ('MMR-AF-142', 0), ('MMR-AF-143', 5),
  ('MMR-AF-144', 7), ('MMR-AF-145', 0), ('MMR-AF-146', 4), ('MMR-AF-147', 9),
  ('MMR-AF-148', 6), ('MMR-AF-149', 0), ('MMR-AF-150', 3), ('MMR-AF-151', 10),
  ('MMR-AF-152', 0), ('MMR-AF-153', 5), ('MMR-AF-154', 8), ('MMR-AF-155', 6),
  ('MMR-AF-156', 0), ('MMR-AF-157', 12), ('MMR-AF-158', 4), ('MMR-AF-159', 7),
  ('MMR-AF-160', 0), ('MMR-AF-161', 5), ('MMR-AF-162', 9), ('MMR-AF-163', 0),
  ('MMR-AF-164', 3)
)
update public.products p
set status = 'active',
    deleted_at = null,
    brand_id = (select id from public.brands where slug = 'modmyride' limit 1),
    source_url = null,
    tags = array_remove(p.tags, 'Autofurnish'),
    description = case
      when p.sku in ('MMR-AF-140','MMR-AF-141','MMR-AF-142','MMR-AF-143','MMR-AF-144','MMR-AF-145','MMR-AF-146','MMR-AF-147','MMR-AF-148','MMR-AF-151','MMR-AF-152','MMR-AF-156','MMR-AF-159','MMR-AF-161','MMR-AF-162','MMR-AF-163') then p.name || '. Vehicle-specific floor mat set; confirm the vehicle year and trim before ordering.'
      when p.sku in ('MMR-AF-150','MMR-AF-153','MMR-AF-158','MMR-AF-164') then p.name || '. Vehicle-sized exterior cover; confirm body style and model year before ordering.'
      when p.sku in ('MMR-AF-149','MMR-AF-154','MMR-AF-160') then p.name || '. Vehicle-sized boot liner; confirm the boot floor and seat configuration before ordering.'
      when p.sku = 'MMR-AF-155' then p.name || '. Replacement cabin air filter for the listed vehicle.'
      when p.sku = 'MMR-AF-157' then p.name || '. Replacement front wiper blade pair; confirm blade length for your vehicle.'
      else p.name || '. Vehicle-specific accessory; confirm year and trim before ordering.'
    end,
    image = '/images/products/catalog/' || lower(p.sku) || '.svg',
    updated_at = now()
from sample_stock s
where p.sku = s.sku;

with sample_stock(sku, quantity) as (values
  ('MMR-AF-140', 12), ('MMR-AF-141', 8), ('MMR-AF-142', 0), ('MMR-AF-143', 5),
  ('MMR-AF-144', 7), ('MMR-AF-145', 0), ('MMR-AF-146', 4), ('MMR-AF-147', 9),
  ('MMR-AF-148', 6), ('MMR-AF-149', 0), ('MMR-AF-150', 3), ('MMR-AF-151', 10),
  ('MMR-AF-152', 0), ('MMR-AF-153', 5), ('MMR-AF-154', 8), ('MMR-AF-155', 6),
  ('MMR-AF-156', 0), ('MMR-AF-157', 12), ('MMR-AF-158', 4), ('MMR-AF-159', 7),
  ('MMR-AF-160', 0), ('MMR-AF-161', 5), ('MMR-AF-162', 9), ('MMR-AF-163', 0),
  ('MMR-AF-164', 3)
)
insert into public.inventory as inv(product_id, quantity, low_stock_threshold)
select p.id, s.quantity, 3
from sample_stock s
join public.products p on p.sku = s.sku
left join public.inventory i on i.product_id = p.id
on conflict (product_id) do update
set quantity = coalesce(inv.reserved, 0) + excluded.quantity,
    low_stock_threshold = 3,
    updated_at = now();

update public.products p
set in_stock = (i.quantity > i.reserved), updated_at = now()
from public.inventory i
where i.product_id = p.id
  and p.sku between 'MMR-AF-140' and 'MMR-AF-164';

commit;
