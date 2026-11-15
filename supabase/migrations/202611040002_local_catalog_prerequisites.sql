-- Provide source rows before imported accessory migrations attach product fitment.
insert into public.categories(name, description, slug, sort_order) values
  ('Interior', 'Cabin comfort, protection, and organization.', 'interior', 1),
  ('Exterior', 'Body styling and practical exterior protection.', 'exterior', 2),
  ('Lighting', 'Road, cabin, and auxiliary lighting upgrades.', 'lighting', 3),
  ('Wheels & Tyres', 'Wheels, tyre care, and fitment essentials.', 'wheels-tyres', 4),
  ('Audio & Tech', 'Connected driving, sound, and camera systems.', 'audio-tech', 5),
  ('Safety & Maintenance', 'Service parts and essential roadside equipment.', 'safety-maintenance', 6),
  ('Car Care & Utility', 'Cleaning, storage, and everyday utility.', 'car-care-utility', 7),
  ('Performance', 'Handling, braking, and powertrain upgrades.', 'performance', 8)
on conflict (name) do update set description=excluded.description, slug=excluded.slug, sort_order=excluded.sort_order;

insert into public.brands(name, slug, description) values
  ('Autofurnish', 'autofurnish', 'Vehicle-focused interior accessories.'),
  ('ModMyRide', 'modmyride', 'Curated fitment-first upgrades.'),
  ('Ford', 'ford', 'Ford vehicle-specific demo accessories.')
on conflict (name) do update set slug=excluded.slug, description=excluded.description;

insert into public.vehicles(make,model,year_from,year_to,source_key,source)
values
  ('Ford','EcoSport',2013,2021,'ford:EcoSport:2013:2021','india-curated'),
  ('Ford','Figo',2010,2021,'ford:Figo:2010:2021','india-curated'),
  ('Ford','Aspire',2015,2021,'ford:Aspire:2015:2021','india-curated'),
  ('Ford','Endeavour',2003,2021,'ford:Endeavour:2003:2021','india-curated'),
  ('Ford','Freestyle',2018,2021,'ford:Freestyle:2018:2021','india-curated'),
  ('Ford','Mustang',2016,2026,'ford:Mustang:2016:2026','india-curated'),
  ('Mahindra','XUV 3XO',2024,null,'mahindra:XUV 3XO:2024:','india-curated'),
  ('Tata','Nexon',2017,null,'tata:Nexon:2017:','india-curated'),
  ('Hyundai','Creta',2015,null,'hyundai:Creta:2015:','india-curated'),
  ('Toyota','Innova Crysta',2016,null,'toyota:Innova Crysta:2016:','india-curated'),
  ('Mahindra','Thar',2010,null,'mahindra:Thar:2010:','india-curated'),
  ('Tata','Punch EV',2024,null,'tata:Punch EV:2024:','india-curated'),
  ('Honda','City',1998,null,'honda:City:1998:','india-curated'),
  ('Maruti Suzuki','Swift',2005,null,'maruti suzuki:Swift:2005:','india-curated'),
  ('BMW','3 Series',2007,null,'bmw:3 Series:2007:','india-curated'),
  ('Kia','Sonet',2020,null,'kia:Sonet:2020:','india-curated')
on conflict (source_key) do update set make=excluded.make,model=excluded.model,year_from=excluded.year_from,year_to=excluded.year_to,source=excluded.source;
