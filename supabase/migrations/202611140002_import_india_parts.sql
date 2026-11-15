-- Source-linked accessory demo catalog; prices are snapshots, not live supplier data.
-- Safe to re-run. Does not change existing products, orders, or inventory except these SKUs.
begin;

alter table public.products add column if not exists source_url text;

with imported(sku,name,category,description,price,tags,popularity,image,source_url,make,model) as (values
  ('MMR-AF-101','Ford EcoSport 2013–16 7D Custom Floor Mats','Interior','Demo import based on an AutoFurnish listing. Illustrative project photo; supplier price, stock, and fitment are not synchronized. Confirm exact generation before purchase.',4990,array['Ford','EcoSport','7D mats','floor mats','Autofurnish'],96,'/images/products/ford-ecosport-floor-mats.png','https://www.autofurnish.com/products/7d-luxury-car-footmats-for-ford-ecosport2013-16-custom-designed-pu-leather-with-7-layer-depth-24mm-2-rows','Ford','EcoSport'),
  ('MMR-AF-102','Mahindra XUV 3XO Manual 7D Floor Mats','Interior','Demo import based on an AutoFurnish listing. Illustrative project photo; supplier price and availability can change. Verify manual-transmission fitment.',5390,array['Mahindra','XUV 3XO','7D mats','floor mats','Autofurnish'],92,'/images/products/ford-ecosport-floor-mats.png','https://www.autofurnish.com/products/autofurnish-7d-luxury-custom-fitted-car-mats-for-mahindra-xuv-3xo-2024-manual','Mahindra','XUV 3XO'),
  ('MMR-AF-103','Mahindra XUV 3XO Automatic 7D Floor Mats','Interior','Demo import based on an AutoFurnish listing. Illustrative project photo; supplier price and availability can change. Verify automatic-transmission fitment.',5390,array['Mahindra','XUV 3XO','automatic','7D mats','floor mats','Autofurnish'],91,'/images/products/ford-ecosport-floor-mats.png','https://www.autofurnish.com/products/autofurnish-7d-luxury-custom-fitted-car-mats-for-mahindra-xuv-3xo-2024','Mahindra','XUV 3XO'),
  ('MMR-AF-104','Mahindra XUV 3XO Automatic 9D Premium Mats','Interior','Demo import based on an AutoFurnish listing. Illustrative project photo; verify year and transmission before purchase.',7990,array['Mahindra','XUV 3XO','automatic','9D premium mats','floor mats','Autofurnish'],90,'/images/products/ford-ecosport-floor-mats.png','https://www.autofurnish.com/products/mahindra-xuv-3xoautomatic2024-autofurnish-9d-premium-custom-fitted-car-mat','Mahindra','XUV 3XO'),
  ('MMR-AF-105','Tata Nexon 2020 7D Luxury Floor Mats','Interior','Demo import based on an AutoFurnish listing. Illustrative project photo; check exact model year and cabin layout.',5390,array['Tata','Nexon','7D mats','floor mats','Autofurnish'],89,'/images/products/ford-ecosport-floor-mats.png','https://www.autofurnish.com/products/7d-luxury-car-footmats-for-tata-nexon2020-custom-designed-pu-leather-with-7-layer-depth-24mm-2-rows','Tata','Nexon'),
  ('MMR-AF-106','Hyundai Creta 2024 7D Floor Mats','Interior','Demo import based on an AutoFurnish listing. Illustrative project photo; check exact Creta year and variant.',5390,array['Hyundai','Creta','7D mats','floor mats','Autofurnish'],87,'/images/products/ford-ecosport-floor-mats.png','https://www.autofurnish.com/products/7d-luxury-car-footmats-for-hyundai-creta-2024-custom-designed-pu-leather-with-7-layer-depth-24mm-2-rows','Hyundai','Creta'),
  ('MMR-AF-107','Toyota Innova Crysta 2016–23 7D Mats','Interior','Demo import based on an AutoFurnish listing. Illustrative project photo; confirm third-row configuration.',6290,array['Toyota','Innova Crysta','7D mats','floor mats','Autofurnish'],85,'/images/products/ford-ecosport-floor-mats.png','https://www.autofurnish.com/products/7d-luxury-car-footmats-for-toyota-innova-crysta-custom-designed-pu-leather-with-7-layer-depth-24mm-3-rows','Toyota','Innova Crysta'),
  ('MMR-AF-108','Mahindra Thar 2020 7D Luxury Floor Mats','Interior','Demo import based on an AutoFurnish accessory listing. Illustrative project photo; verify generation and body style.',5390,array['Mahindra','Thar','7D mats','floor mats','Autofurnish'],84,'/images/products/ford-ecosport-floor-mats.png','https://www.autofurnish.com/collections/car-accessories','Mahindra','Thar'),
  ('MMR-AF-109','Tata Punch EV 2024 7D Custom Mats','Interior','Demo import based on an AutoFurnish mats listing. Illustrative project photo; verify EV-specific floor layout.',5390,array['Tata','Punch EV','7D mats','floor mats','Autofurnish'],83,'/images/products/ford-ecosport-floor-mats.png','https://www.autofurnish.com/collections/car-foot-mats','Tata','Punch EV'),
  ('MMR-AF-110','Toyota Innova Crysta 7D Boot Mat','Car Care & Utility','Demo import based on an AutoFurnish boot-mat listing. Illustrative project photo; check boot-floor and seat-fold configuration.',1590,array['Toyota','Innova Crysta','boot mat','trunk liner','Autofurnish'],78,'/images/products/ford-endeavour-cargo-liner.png','https://www.autofurnish.com/collections/car-trunk-mats','Toyota','Innova Crysta'),
  ('MMR-AF-111','Ford EcoSport Triple-Stitched Body Cover','Exterior','Demo import based on an AutoFurnish listing. Illustrative project photo; verify mirror-pocket and antenna configuration.',1495,array['Ford','EcoSport','body cover','car cover','Autofurnish'],82,'https://images.pexels.com/photos/36903243/pexels-photo-36903243.jpeg?auto=compress&cs=tinysrgb&w=1200','https://www.autofurnish.com/products/sporty-series-car-cover-for-ford-ecosport-triple-stitched-water-resistant-and-heat-resistant-with-mirror-pockets','Ford','EcoSport'),
  ('MMR-AF-112','Universal Collapsible Boot Organizer','Car Care & Utility','Demo import based on an AutoFurnish universal-accessory listing. Illustrative project photo; confirm dimensions and availability.',499,array['universal','boot organizer','trunk storage','Autofurnish'],75,'https://images.pexels.com/photos/20051469/pexels-photo-20051469.jpeg?auto=compress&cs=tinysrgb&w=1200','https://www.autofurnish.com/products/autofurnish-car-trunk-boot-dicky-organizer-all-cars-universal-collapsible-mesh-net-multi-pocket-storage-for-tools-bottles-clothes-toys-documents-for-suv-muv-hatchback-adjustable-buckle-car-accessories-interior',null,null),
  ('MMR-AF-113','Universal PU Leather Neck-Rest Pair','Interior','Demo import based on an AutoFurnish universal-accessory listing. Illustrative project photo; verify dimensions and availability.',499,array['universal','neck rest','headrest cushion','Autofurnish'],73,'https://images.pexels.com/photos/17450517/pexels-photo-17450517.jpeg?auto=compress&cs=tinysrgb&w=1200','https://www.autofurnish.com/products/crescent-car-pillow-neck-rest-pu-leather-with-ergonomic-support-and-pressure-absorbent-polly-fil-set-of-2',null,null),
  ('MMR-AF-114','Universal Heat-Resistant Windshield Cover','Exterior','Demo import based on an AutoFurnish universal-accessory listing. Illustrative project photo; measure the windscreen and confirm supplier availability.',649,array['universal','windshield cover','sunshade','Autofurnish'],71,'https://images.pexels.com/photos/36903243/pexels-photo-36903243.jpeg?auto=compress&cs=tinysrgb&w=1200','https://www.autofurnish.com/collections/universal-car-accessories',null,null)
), upserted as (
  insert into public.products(sku,name,category_id,brand_id,description,price,tags,popularity,status,in_stock,image,source_url)
  select i.sku,i.name,c.id,b.id,i.description,i.price,i.tags,i.popularity,'active',true,i.image,i.source_url
  from imported i join public.categories c on c.name=i.category join public.brands b on b.slug='autofurnish'
  on conflict(sku) do update set name=excluded.name,category_id=excluded.category_id,brand_id=excluded.brand_id,
    description=excluded.description,price=excluded.price,tags=excluded.tags,popularity=excluded.popularity,
    status='active',deleted_at=null,image=excluded.image,source_url=excluded.source_url
  returning id,sku
)
insert into public.inventory(product_id,quantity,low_stock_threshold)
select id,12,4 from upserted
on conflict(product_id) do update set low_stock_threshold=excluded.low_stock_threshold,updated_at=now();

-- Exact fitments only; universal products use the current India-market vehicle table.
insert into public.product_compatibility(product_id,vehicle_id,notes)
select p.id,v.id,'Demo fitment reference; verify exact year, trim, and dimensions with supplier.'
from public.products p
join (values
  ('MMR-AF-101','Ford','EcoSport'),('MMR-AF-102','Mahindra','XUV 3XO'),('MMR-AF-103','Mahindra','XUV 3XO'),
  ('MMR-AF-104','Mahindra','XUV 3XO'),('MMR-AF-105','Tata','Nexon'),('MMR-AF-106','Hyundai','Creta'),
  ('MMR-AF-107','Toyota','Innova Crysta'),('MMR-AF-108','Mahindra','Thar'),('MMR-AF-109','Tata','Punch EV'),
  ('MMR-AF-110','Toyota','Innova Crysta'),('MMR-AF-111','Ford','EcoSport')
) fit(sku,make,model) on fit.sku=p.sku
join public.vehicles v on v.make=fit.make and v.model=fit.model
on conflict(product_id,vehicle_id) do update set notes=excluded.notes;

insert into public.product_compatibility(product_id,vehicle_id,notes)
select p.id,v.id,'Universal accessory demo; confirm dimensions and installation requirements.'
from public.products p cross join public.vehicles v
where p.sku in ('MMR-AF-112','MMR-AF-113','MMR-AF-114')
on conflict(product_id,vehicle_id) do update set notes=excluded.notes;

commit;
